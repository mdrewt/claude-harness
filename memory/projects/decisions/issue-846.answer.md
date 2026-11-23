# DECISION ANSWER — issue 846 (OPEN)

## Question (issue title)
DECISION(lpw-15): under Allowlist, does an account off the list keep out an identity the host admitted befor

## Operator response(s)

### 2026-11-22T07:16:05Z
There should be one Allowlist per game-world (in case the user wants to start over in a brand new instance of the game multiple times). If the user is changing an existing world's settings to utilize an allowlist, then the Allowlist should be created with any currently connected players already added to the list by default. The list should also always include the account of the hosting player so that they are always allowed into their own worlds. If it is relatively simple to add everyone that has ever connected to a specific instance to that instance's Allowlist, then you may do so, but I don't want any new tables or complicated logic added just to support this behavior. Once created, the Allowlist is the source of truth for which identities are allowed to join the world, and the hosting player may revoke permission by deleting an identity from the list or permit an additional identity by adding it.

Allowlists can also be switched off, in which case the game goes back to the behavior before the existence of the Allowlist.
