FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose Vite's default dev port
EXPOSE 5173

# Start the Vite dev server and expose host network
CMD ["npm", "run", "dev", "--", "--host"]
