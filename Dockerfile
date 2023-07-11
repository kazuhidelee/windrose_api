FROM node:13-alpine
RUN mkdir -p /home/app
COPY . /home/app
CMD ["node", "/home/app/API.js"]
EXPOSE 8080