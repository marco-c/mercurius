FROM node:latest

# Install redis
RUN apt-get update && apt-get install -y redis-server

# Install Mercurius
RUN mkdir /src
WORKDIR /src
ADD . /src
RUN npm install
RUN npm run build

EXPOSE 4000

RUN chmod +x start.sh
CMD ./start.sh