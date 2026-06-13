@echo off
set PATH=%PATH%;C:\Program Files\nodejs
npx create-next-app@latest dashboard --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
exit
