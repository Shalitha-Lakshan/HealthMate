FROM node:20-alpine
WORKDIR /app

# Install dependencies first for Docker caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Start the Node app with nodemon for hot reloading
CMD ["npm", "run", "dev"]
