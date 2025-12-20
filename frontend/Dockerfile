FROM node:20

WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Run Vite and tell it to listen on all network interfaces
CMD ["npm", "run", "dev", "--", "--host"]
