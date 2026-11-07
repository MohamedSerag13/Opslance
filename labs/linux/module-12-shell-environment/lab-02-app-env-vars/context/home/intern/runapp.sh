#!/bin/bash
source "$HOME/.bashrc"
: "${APP_ENV:?APP_ENV not set}"
: "${API_PORT:?API_PORT not set}"
echo "app starting in $APP_ENV on port $API_PORT"
