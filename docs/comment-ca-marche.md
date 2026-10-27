# Comment marche le solveur de Waymark ?

> Ce document explique, pas à pas et avec des mots simples, ce que fait le serveur `solver/` :
> quels problèmes il résout, ce qu'il reçoit, comment il réfléchit, et ce qu'il renvoie à
> l'application pour qu'elle dessine les tournées sur la carte.

---

## 1. L'histoire de départ

Imagine une boulangerie. Chaque matin, des camionnettes partent de la boulangerie (on l'appelle
**le dépôt**) pour livrer du pain chez des clients (on les appelle **les arrêts**), puis elles
rentrent à la boulangerie.

La question est toujours la même :

> **Quel chemin chaque camionnette doit-elle prendre pour que le trajet total soit le plus court
> possible ?**

Avec 3 clients, on peut essayer toutes les possibilités à la main. Mais avec 20 clients, il existe
plus de **2 milliards de milliards** d'ordres de passage différents. Même un ordinateur ne peut pas
tous les essayer. Il faut donc être malin : c'est le travail du **solveur**.

---

## 2. Les quatre problèmes

Waymark sait résoudre quatre variantes de ce problème. Chacune ajoute une règle à la précédente.

### TSP : le voyageur de commerce

**Une seule camionnette** doit passer chez **tous** les clients, une fois chacun, puis rentrer.

> C'est comme faire le tour de tes amis pour leur donner une invitation d'anniversaire, puis
> rentrer à la maison, en marchant le moins possible.

Ce que tu donnes : la liste des arrêts.

### VRP : plusieurs véhicules

Maintenant il y a **plusieurs camionnettes**. Il faut décider **qui livre qui**, puis l'ordre de
chaque tournée. Waymark essaie aussi d'**équilibrer** : on évite qu'un chauffeur fasse 80 km
pendant qu'un autre en fait 5.

> C'est comme partager les invitations entre toi et tes frères et sœurs, pour que personne ne
> marche beaucoup plus que les autres.

Ce que tu donnes : les arrêts et le nombre de véhicules.

### CVRP : des camions qui ont une taille limite

Chaque client commande une **quantité** (par exemple 3 caisses), et chaque camionnette a une
**capacité** (par exemple 12 caisses au maximum). Une tournée ne peut jamais transporter plus que
la capacité du véhicule.

> C'est comme un sac à dos : tu ne peux pas y mettre plus de livres qu'il n'en contient. S'il est
> plein, il faut un deuxième sac (un deuxième véhicule).

Ce que tu donnes : les arrêts, les quantités par arrêt, la capacité de chaque véhicule.

### VRPTW : des horaires à respecter

Chaque client a une **fenêtre horaire** : il est disponible, par exemple, **entre 9h00 et 12h00**.
La camionnette doit arriver dans cette fenêtre. Si elle arrive trop tôt, elle **attend**. Si elle
arriverait trop tard, ce plan n'est pas accepté. On compte aussi le **temps passé chez chaque
client** (décharger, faire signer), par exemple 5 minutes.

> C'est comme passer chez des amis qui ne sont à la maison qu'à certaines heures : Ali est là
> le matin, Sara seulement l'après-midi. Ton parcours doit tenir compte de leurs horaires.

Ce que tu donnes : les arrêts, le nombre de véhicules, la fenêtre de chaque arrêt, les minutes
passées à chaque arrêt.

---

## 3. Le voyage d'une demande, en un coup d'œil

```
 Navigateur (Angular)                     Serveur solveur (Flask)
 ────────────────────                     ───────────────────────
 1. L'utilisateur clique "Solve"
 2. Envoie le plan en JSON  ───────────►  3. Vérifie qui envoie (Supabase)
    + le jeton de connexion               4. Vérifie chaque donnée (validation)
                                          5. Mesure les distances (OSRM)
                                          6. Cherche les meilleures tournées (OR-Tools)
 8. Dessine la carte, la    ◄───────────  7. Renvoie les tournées en JSON
    légende et les résultats
```

Voyons chaque étape.

---

## 4. Ce que le serveur reçoit

L'application envoie une requête **HTTP POST** à l'une de ces adresses :

| Adresse | Problème |
|---|---|
| `POST /tsp` | voyageur de commerce |
| `POST /vrp` | plusieurs véhicules |
| `POST /cvrp` | avec capacités |
| `POST /vrptw` | avec fenêtres horaires |

Avec la requête, il y a deux choses :

**1. Un en-tête de connexion** (comme un badge pour entrer dans un bâtiment) :

```
Authorization: Bearer eyJhbGciOi...   ← le jeton Supabase de l'utilisateur connecté
```

**2. Un corps en JSON** (le plan). Voici un exemple complet pour le problème avec horaires :

```json
{
  "locations": [
    { "lat": 33.6057, "lng": -7.5300, "label": "Dépôt, Aïn Sebaâ" },
    { "lat": 33.5806, "lng": -7.6327, "label": "Maârif" },
    { "lat": 33.5915, "lng": -7.6290 }
  ],
  "vehicles": 2,
  "time_windows": [[420, 1140], [480, 720], [540, 780]],
  "service_minutes": 5
}
```

Que veut dire chaque champ ?

| Champ | Pour quels problèmes | Explication |
|---|---|---|
| `locations` | tous | La liste des lieux. **Le premier (case 0) est toujours le dépôt.** Chaque lieu a une latitude `lat`, une longitude `lng`, et un nom `label` facultatif. |
| `vehicles` | VRP, CVRP, VRPTW | Le nombre de véhicules. |
| `demands` | CVRP | La quantité demandée par chaque lieu, dans le même ordre que `locations`. Celle du dépôt est ignorée. |
| `capacities` | CVRP | La capacité de chaque véhicule (un nombre par véhicule). |
| `time_windows` | VRPTW | Pour chaque lieu, `[début, fin]` **en minutes depuis minuit**. |
| `service_minutes` | VRPTW | Le temps passé chez chaque client (0 à 240 minutes). |

### Pourquoi des minutes depuis minuit ?

Parce que c'est facile à calculer pour un ordinateur. On transforme l'heure en un seul nombre :

```
heure × 60 + minutes

 7h00  →   7 × 60      =  420
 9h30  →   9 × 60 + 30 =  570
19h00  →  19 × 60      = 1140
```

Donc `[480, 720]` veut dire **de 8h00 à 12h00**. L'application fait elle-même la conversion :
l'utilisateur tape `08:00` et le serveur reçoit `480`.

---

## 5. Étape 1 : vérifier qui demande (`auth.py`)

Avant tout calcul, le serveur vérifie le **jeton** :

1. Pas de jeton ? Réponse **401** : « Sign in to use the solver. »
2. Sinon, il demande à Supabase : « Ce jeton est-il valide ? » (en appelant la fonction
   `has_solver_access` de la base de données). Supabase vérifie la signature et la date
   d'expiration du jeton.
3. Si le jeton est faux ou expiré, réponse **401**. Si tout va bien, le serveur s'en **souvient
   pendant 60 secondes**, pour ne pas redemander à Supabase à chaque calcul.

Il y a aussi une **limite de vitesse** : 20 calculs par minute et par utilisateur. Au-delà, la
réponse est **429** (« Too many solves »). C'est pour que personne ne surcharge le serveur.

---

## 6. Étape 2 : vérifier les données (`validation.py`)

Le serveur ne fait **jamais confiance** aux données reçues. Il vérifie tout, comme un
professeur qui relit une copie avant de la noter :

| Vérification | Exemple de message d'erreur |
|---|---|
| Au moins 2 lieux (un dépôt et un arrêt), au plus 150 | « Add a depot and at least one stop. » |
| Latitude entre -90 et 90, longitude entre -180 et 180 | « Coordinates of stop 3 are outside the map. » |
| Des nombres, pas du texte ni `true`/`false` | « Latitude of stop 2 must be a number. » |
| Entre 1 et 50 véhicules, nombre entier | « Number of vehicles must be between 1 and 50. » |
| Une quantité par lieu, une capacité par véhicule | « Demands needs exactly 12 entries, one per stop. » |
| Aucun client ne demande plus que le plus gros camion | « Stop 4 needs 9 units but the largest vehicle carries 8. » |
| La flotte peut tout transporter | « Stops need 40 units in total but the fleet carries 36. » |
| Chaque fenêtre ouvre avant de fermer | « The window for stop 2 must open before it closes. » |
| Chaque fenêtre croise les horaires du dépôt | « The window for stop 5 falls outside the depot's opening hours. » |

Si quelque chose ne va pas, le serveur répond **400** avec un message clair **et** le nom du champ
fautif, par exemple :

```json
{ "error": "Number of vehicles must be between 1 and 50.", "field": "vehicles" }
```

Ainsi, l'application peut dire exactement à l'utilisateur quoi corriger.

> **Pourquoi c'est si important ?** Le moteur OR-Tools peut **planter tout le serveur** s'il
> reçoit une liste vide. Vérifier avant protège le serveur pour tout le monde.

---

## 7. Étape 3 : mesurer les distances (`matrix.py`)

Pour choisir le meilleur chemin, le solveur doit connaître la distance **entre chaque paire de
lieux**. On range tout ça dans un grand tableau qu'on appelle une **matrice** :

```
                Dépôt     Maârif    Gauthier
   Dépôt          0       11 240     10 870
   Maârif      11 310         0      1 672
   Gauthier    10 905     1 650          0        (en mètres, valeurs d'exemple)
```

> C'est comme le tableau des distances entre villes qu'on trouve au dos de certaines cartes
> routières.

**Où trouve-t-on ces distances ?** Le serveur demande au service **OSRM**, qui connaît toutes les
routes (grâce aux données OpenStreetMap). OSRM renvoie deux tableaux :

- les **distances** par la route, en mètres ;
- les **durées** de trajet, en secondes.

Remarque : la distance de A vers B n'est pas toujours égale à celle de B vers A (à cause des sens
uniques). C'est normal.

**Et si OSRM ne répond pas ?** Le serveur ne s'arrête pas. Il fait une **estimation** :

1. il calcule la distance **à vol d'oiseau** entre deux points (formule de Haversine, qui tient
   compte du fait que la Terre est ronde) ;
2. il la multiplie par **1,3**, car les routes ne sont jamais toutes droites ;
3. il calcule la durée en supposant une vitesse moyenne de **40 km/h** en ville.

Dans ce cas, la réponse contient `"matrix": "straight"` pour que l'application prévienne
l'utilisateur que les distances sont estimées.

> **Une erreur corrigée :** l'ancienne version arrondissait les distances au **kilomètre**. Deux
> quartiers voisins se retrouvaient à « 0 km » l'un de l'autre, et le solveur ne voyait plus la
> différence. Maintenant, tout est en **mètres**.

---

## 8. Étape 4 : chercher les meilleures tournées (`solver.py`)

C'est le cœur du système. On utilise **OR-Tools**, une bibliothèque gratuite de Google, faite
exactement pour ce genre de problème.

### Un seul modèle pour les quatre problèmes

Au lieu d'avoir quatre programmes différents, il y a **un seul modèle** auquel on ajoute des règles
selon le problème. C'est comme un jeu de société avec des règles de base, et des cartes « règle
spéciale » qu'on ajoute ou non.

**Règle de base (tous les problèmes)** : chaque trajet entre deux lieux « coûte » sa distance en
mètres. Le solveur cherche les tournées dont le **coût total** est le plus petit.

**Carte spéciale VRP : l'équilibre.** On ajoute une pénalité sur la **tournée la plus longue**.
Le solveur préfère donc répartir le travail plutôt que tout donner au même chauffeur.

**Carte spéciale CVRP : la charge.** Le solveur garde un **compteur** pour chaque camion. À chaque
client, on ajoute sa quantité. Le compteur n'a jamais le droit de dépasser la capacité du camion.

```
Camion 1 (capacité 12) :  Dépôt → Mers Sultan (+1) → Hay Hassani (+3) → Oulfa (+3) → Sidi Maârouf (+5)
Compteur :                  0          1                  4               7               12  ✓
```

**Carte spéciale VRPTW : l'horloge.** Le solveur garde une **horloge** pour chaque camion :

- rouler d'un lieu à l'autre fait avancer l'horloge du temps de trajet (arrondi à la minute
  supérieure) ;
- en repartant d'un client, on ajoute le temps passé chez lui (`service_minutes`) ;
- en arrivant chez un client, l'horloge doit être **dans sa fenêtre**. Si on est en avance, on a le
  droit d'**attendre** ;
- le camion part et rentre pendant les heures d'ouverture du dépôt.

Deux petites astuces rendent le résultat plus réaliste :

1. **On compte un petit prix pour chaque minute de tournée**, même passée à attendre. Résultat :
   le camion part du dépôt au bon moment, au lieu de partir à 7h00 pour attendre deux heures devant
   la porte du premier client.
2. **On demande l'heure d'arrivée la plus tôt possible** à chaque arrêt, pour afficher des heures
   claires et utiles.

### Comment OR-Tools cherche

Il travaille en deux temps, comme quelqu'un qui fait un puzzle :

1. **Une première solution rapide** (stratégie `PATH_CHEAPEST_ARC`) : depuis le dépôt, il va
   toujours vers le lieu le plus proche qui reste. C'est correct, mais rarement parfait.
2. **L'amélioration** (stratégie `GUIDED_LOCAL_SEARCH`) : il essaie de petites modifications
   (échanger deux clients, déplacer un client dans une autre tournée…) et garde celles qui
   raccourcissent le trajet. Il évite aussi de tourner en rond sur les mêmes idées.

On lui laisse **entre 1 et 10 secondes** selon la taille du plan (1 seconde de plus par tranche de
15 lieux). Après ce temps, on prend la meilleure solution trouvée.

### Et s'il n'y a pas de solution ?

Parfois, c'est impossible : par exemple, tous les clients veulent être livrés entre 8h00 et 8h02
avec une seule camionnette. Le serveur répond alors **422** avec une explication et un conseil :

```json
{ "error": "No plan reaches every stop inside its window. Widen the windows, add vehicles, or reduce the minutes spent at each stop." }
```

---

## 9. Ce que le serveur renvoie

Si tout va bien, la réponse est **200** avec ce JSON (exemple raccourci : la vraie tournée passe par
plus d'arrêts) :

```json
{
  "problem": "vrptw",
  "matrix": "road",
  "routes": [
    {
      "vehicle": 0,
      "distance_m": 59214,
      "duration_s": 4980,
      "stops": [
        { "index": 0, "lat": 33.6057, "lng": -7.53,   "label": "Dépôt, Aïn Sebaâ", "window": [420, 1140], "arrival": 613 },
        { "index": 8, "lat": 33.573,  "lng": -7.6,    "label": "Derb Sultan",      "window": [480, 720],  "arrival": 625 },
        { "index": 2, "lat": 33.5915, "lng": -7.629,  "label": "Gauthier",         "window": [540, 780],  "arrival": 637 },
        { "index": 0, "lat": 33.6057, "lng": -7.53,   "label": "Dépôt, Aïn Sebaâ", "window": [420, 1140], "arrival": 867 }
      ]
    }
  ]
}
```

Comment le lire :

| Champ | Explication |
|---|---|
| `problem` | Le problème résolu. |
| `matrix` | `"road"` si les distances viennent des vraies routes, `"straight"` si ce sont des estimations. |
| `routes` | Une tournée **par véhicule**, dans l'ordre. |
| `vehicle` | Le numéro du véhicule (0 = le premier). |
| `distance_m`, `duration_s` | Longueur totale de la tournée (mètres) et temps de conduite (secondes). |
| `load` | (CVRP) La charge totale transportée par ce véhicule. |
| `stops` | Les arrêts **dans l'ordre de passage**. La tournée commence et finit toujours au dépôt. |
| `index` | La position du lieu dans la liste envoyée au départ. C'est grâce à lui que l'application sait quel marqueur colorier. |
| `label` | Le nom du lieu (celui envoyé par l'application). |
| `demand` | (CVRP) La quantité livrée à cet arrêt. |
| `window`, `arrival` | (VRPTW) La fenêtre du client et l'heure d'arrivée prévue, en minutes depuis minuit. Ici `613` = 10h13. |

Un véhicule dont la liste `stops` ne contient que le dépôt (aller puis retour) **n'est pas
utilisé** : on n'avait pas besoin de lui.

### Tous les codes de réponse

| Code | Signification |
|---|---|
| 200 | Les tournées sont prêtes. |
| 400 | Une donnée est invalide (`error` + `field` disent laquelle). |
| 401 | Pas connecté, ou session expirée. |
| 403 | Ce compte n'a pas le droit d'utiliser le solveur. |
| 404 | Problème inconnu (par exemple `/abc`). |
| 413 | La requête est trop grosse. |
| 422 | Aucun plan ne respecte toutes les règles. |
| 429 | Trop de calculs en une minute. |
| 500 | Erreur inattendue du serveur (elle est enregistrée dans les journaux). |
| 503 | Le service de connexion (Supabase) ne répond pas. |

---

## 10. Ce que fait l'application avec la réponse

Côté navigateur, le fichier `web/src/app/features/solver/data-access/solver.service.ts` est le
**traducteur** : c'est le seul endroit qui connaît le format JSON du serveur. Il transforme la
réponse en objets simples que le reste de l'application comprend.

Ensuite :

1. **Les tracés sur la carte.** Le serveur renvoie l'**ordre** des arrêts, pas le dessin exact des
   rues. Pour chaque véhicule, l'application demande donc à OSRM le chemin réel qui relie ses
   arrêts dans cet ordre, puis le dessine avec une couleur par véhicule (magenta, bleu mer, vert
   forêt…). Si OSRM ne répond pas, la ligne est dessinée **en pointillés** et la légende l'indique.
2. **Les marqueurs.** Grâce à `index`, chaque marqueur prend la couleur de son véhicule.
3. **La légende** (en bas à gauche de la carte) : la couleur, la distance et le temps de chaque
   véhicule. Un clic sur une ligne met en avant cette tournée.
4. **L'onglet Résultats** : les totaux (distance, temps de conduite, nombre d'arrêts, véhicules
   utilisés), puis une carte par véhicule avec la liste ordonnée des arrêts, la barre de charge
   (CVRP) ou les heures d'arrivée à côté des fenêtres (VRPTW).
5. **L'export CSV** : l'utilisateur peut télécharger le plan (véhicule, ordre, nom, coordonnées,
   quantité, fenêtre, heure d'arrivée) pour l'envoyer aux chauffeurs.

### Et les noms des rues ?

Le serveur ne cherche **pas** les adresses : ce serait lent, car le service d'adresses
(Nominatim) n'accepte qu'**une demande par seconde**. C'est l'application qui s'en charge, en
arrière-plan, au moment où l'utilisateur pose un arrêt sur la carte. Quand l'utilisateur clique sur
« Solve », chaque arrêt a déjà son nom, qui est envoyé dans `label` et revient dans la réponse.

---

## 11. Résumé en une phrase par fichier

| Fichier | Son rôle, en une phrase |
|---|---|
| `solver/server.py` | La porte d'entrée : reçoit la demande, appelle les autres fichiers, renvoie la réponse. |
| `solver/auth.py` | Le gardien : vérifie le jeton et limite le nombre de calculs par minute. |
| `solver/validation.py` | Le correcteur : vérifie chaque donnée et explique les erreurs. |
| `solver/matrix.py` | Le géomètre : mesure les distances et durées entre tous les lieux. |
| `solver/solver.py` | Le cerveau : construit le modèle OR-Tools et trouve les tournées. |
| `solver/tests/` | Les contrôles : vérifient automatiquement que tout fonctionne. |

---

## 12. Petit exercice pour vérifier qu'on a compris

1. Un client est disponible de **14h30 à 16h00**. Quelle valeur faut-il envoyer dans
   `time_windows` ?
2. Tu as 2 camions de capacité 10, et les clients demandent en tout 23 caisses. Que répond le
   serveur, et avec quel code ?
3. Dans une réponse, une tournée a pour arrêts `[0, 0]`. Qu'est-ce que ça veut dire ?

<details>
<summary>Réponses</summary>

1. `[870, 960]`, car 14 × 60 + 30 = 870 et 16 × 60 = 960.
2. Le code **400**, avec le message « Stops need 23 units in total but the fleet carries 20. Add
   vehicles or capacity. » La demande est refusée avant même de lancer le calcul.
3. Ce véhicule part du dépôt et y revient directement : **il n'a pas été utilisé**.

</details>
