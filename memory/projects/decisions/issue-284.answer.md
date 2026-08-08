# DECISION ANSWER — issue 284 (OPEN)

## Question (issue title)
DECISION(rev12-monsterpub-raising-privacy): Should per-monster raising progress (essence pools, Trust, Quality-Time, Nutrition) stay w

## Operator response(s)

### 2026-08-08T09:02:07Z
The `monster_pub` should have an owner filter for row-level security. When players subscribe to the server, they should be allowed to receive all data/updates about their own monsters, but only receive information about monsters owned by other players while actively engaged in battles with those monsters, or during trading for those monsters, or in other cases where monster information is necessary for the player to have (such as possibly some quests or other interactions).

The reasoning for this decision is that being able to see the monsters another player has without that player's knowledge could create a competitive advantage or (in some cases) allow players to cheat. The client requires monster information in many scenarios in order to render the UI and for the client-side prediction to work properly, and it should receive the information it needs in order for those features to function. However, information about monsters that do not belong to the player should only be revealed on a need-to-know basis in order to support those features while being kept private at all other times. Again, a player always has access to their own monster's information.
