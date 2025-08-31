# # Etapa 1: build
# FROM node:21-alpine AS builder

# WORKDIR /app

# COPY package*.json ./
# RUN npm install

# COPY . .
# RUN npm run build
# RUN npm prune --production

# # Etapa 2: producción
# FROM node:21-alpine

# WORKDIR /app

# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/package*.json ./
# # Copy schema files to ensure they're available
# COPY --from=builder /app/src/**/schemas/*.schema.* ./dist/src/**/schemas/

# EXPOSE 3002

# # Use absolute path to ensure main.js is found
# CMD ["node", "/app/dist/src/main.js"]
# #CMD ["npm", "run", "start:dev"]
FROM node:21-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN npm install @nestjs/passport passport passport-jwt @nestjs/axios --save

COPY . .

# Asegurarse de que existan los directorios para las plantillas
RUN mkdir -p /app/dist/mail/templates
RUN mkdir -p /app/dist/src/mail/templates

# Copiar las plantillas HTML
COPY src/mail/templates/*.html /app/dist/mail/templates/
COPY src/mail/templates/*.html /app/dist/src/mail/templates/

# Usar modo desarrollo para depurar más fácilmente
CMD ["npm", "run", "start:dev"]

EXPOSE 3001