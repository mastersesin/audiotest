FROM node:12.18.2 as buildImage
WORKDIR /app
COPY ./dist/jam-demo .
WORKDIR /app
EXPOSE 8080
FROM nginx:1.18
LABEL authors="Duc Tran"
COPY --from=buildImage /app /usr/share/nginx/html
COPY nginx-host /etc/nginx/conf.d/default.conf
