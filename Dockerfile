# Dockerfile for Android APK Build (Java 17, Android SDK, Gradle, Node.js 22)

FROM node:22 AS node_base

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Copy Node.js 22 & npm directly from official Node image
COPY --from=node_base /usr/local/bin /usr/local/bin
COPY --from=node_base /usr/local/lib/node_modules /usr/local/lib/node_modules

# Set environment variables for Android SDK & Java
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=${PATH}:${JAVA_HOME}/bin:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools

WORKDIR /app

# Install Java 17 and required system build tools
RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    curl \
    wget \
    unzip \
    git \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Android SDK Command-line Tools
RUN mkdir -p ${ANDROID_HOME}/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdline-tools.zip && \
    unzip -q /tmp/cmdline-tools.zip -d /tmp && \
    mv /tmp/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest && \
    rm /tmp/cmdline-tools.zip

# Accept Android SDK licenses and install SDK platform & build-tools
RUN yes | sdkmanager --licenses > /dev/null && \
    sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# Copy package dependencies & full source code
COPY package.json package-lock.json* yarn.lock* ./

# Install node dependencies using npm install (handles out-of-sync lockfiles gracefully)
RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build:android

# Ensure Gradle wrapper is executable
RUN chmod +x android/gradlew

# Build Android Release APK inside container
CMD ["sh", "-c", "cd android && ./gradlew assembleRelease"]
