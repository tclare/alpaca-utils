#!/bin/bash

# Git stuff
git add -A
git commit -m "$1"
git push origin main

# Npm stuff
npm version patch
npm publish