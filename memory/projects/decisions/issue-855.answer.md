# DECISION ANSWER — issue 855 (OPEN)

## Question (issue title)
DECISION(lpw-19): a browser knows a friends server only by its address: three defaults to confirm 

## Operator response(s)

### 2026-11-22T16:36:34Z
The "do not keep my player on this computer" is the default behavior for the browser client. The browser should not store the token in any permanent way, so when the browser is closed, the token is also gone.

A player's state should be stored by the server on a per-world basis and associated with a particular Steam account. In general, it should not matter what kind of client a user joins a server with. I should be able to join a friend's server from my desktop client, then log off, then join later from another computer's browser and be able to continue playing as the same character as long as I join the same server using the same Steam-based authentication.

The design should not require the browser client to keep a token, nor should it create a new character every visit. The account service should be able to provide which identity to use for authentication and authorization during the login process. The only difference is that a desktop client can persist that identity so the user doesn't have to log in every time, while a browser client doesn't persist anything and thus requires a login.
