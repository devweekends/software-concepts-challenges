FROM node:24-alpine
WORKDIR /app
COPY package.json server.js ./
ENV PORT=4010 HOST=0.0.0.0
EXPOSE 4010
USER node
HEALTHCHECK --interval=10s --timeout=3s --start-period=3s CMD wget -qO- http://127.0.0.1:4010/version > /dev/null || exit 1
CMD ["node", "server.js"]
