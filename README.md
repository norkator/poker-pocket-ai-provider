# ⚠️ WORK  IN PROGRESS ⚠️

# Poker Pocket AI Provider

This is addon for Nitramite Poker Pocket typescript back end providing AI capability to run chat and poker game
tasks using Large Language Models.

Goal for this is to host two player tables to provide tournament mode where normal user plays against AI and wins
achievement.

Basically this addon will connect into game just like a normal player but all actions will be executed
by https://jan.ai/ app
running locally. This addon expects you have `llama3.1-8b-instruct` model installed.

### Basic setup

1. Add env vars using following sample:
   ```
   POKER_SERVER_API_ADDRESS="ws://localhost:8000"
   JAN_AI_SERVER_ADDRESS=http://localhost:1337
   USERNAME="<user-account>"
   PASSWORD="<user-account-password>"
   TABLE_ID=123
   TABLE_PASSWORD="<table-password>"
   ```
2. Run `npm run start:dev`

#### Optional

For staging connection:

```
POKER_SERVER_API_ADDRESS="wss://pokerpocket-staging.nitramite.com/api"
```

## License

MIT
