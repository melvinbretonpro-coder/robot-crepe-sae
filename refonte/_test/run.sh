#!/bin/zsh
# usage: run.sh <url> <out.png> [w] [h]
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars --window-size=${3:-1440},${4:-900} --virtual-time-budget=9000 --enable-logging=stderr --v=0 --screenshot=$2 "$1" 2>&1 | grep -iE "console|error|uncaught" | grep -v -iE "gpu|dbus|ssl|vulkan|angle|gl_" | head -20
