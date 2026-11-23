# DECISION ANSWER — issue 848 (OPEN)

## Question (issue title)
DECISION(lpw-15): a world binding is checked once and kept: should a refund or ban ever take a player out of

## Operator response(s)

### 2026-11-22T08:01:17Z
A game server attempts to check (or recheck) each player's account for valid access as part of the connection process to any type of world. There are three (or more) possible states for the authorization request:
  1. Some kind of authorization response was received about the account/identity.
  2.  No authorization response was received about an unknown account/identity. (For example, if the server is not connected to the internet and the player is attempting to join for the first time)
  3.  No authorization response was received about a known account/identity. (For example, if the server is not connected to the internet and the player is attempting to re-join with an existing account)

In case 1, the connection is permitted or denied based on the authorization response, and the identity's validity is stored and/or updated.
In case 2, the connection is denied until an authorization response is received and a valid account can be verified.
In case 3, the connection is permitted or denied based on the last known status of the account/identity. So a player may continue connecting to a world after being authorized even if the server is denied internet access afterwards. There is no expiration, but the identity's stored validity may be updated the next time the server receives an authorization response about the account.

Additionally, the account of the server's host is also checked once per day, following similar guidelines.

### 2026-11-22T08:02:40Z
Hopefully, this workflow (or parts of it) may be reused for every type of world. But you are free to make adjustments as needed. Use your best judgment.
