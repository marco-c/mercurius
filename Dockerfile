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


# docker build -t="mercurius" .
# docker run --publish 4000:4000 -e REDISCLOUD_URL="redis://localhost:6379" -e GCM_API_KEY="" mercurius
