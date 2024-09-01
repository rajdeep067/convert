# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json to the working directory
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install FFmpeg and Python
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-venv python3-pip

# Create a virtual environment for Python packages
RUN python3 -m venv /opt/venv

# Install yt-dlp in the virtual environment
RUN /opt/venv/bin/pip install --upgrade yt-dlp

# Set environment variables for Python
ENV PATH="/opt/venv/bin:$PATH"

# Copy the rest of the application code to the working directory
COPY . .

# Expose a port (if needed)
# EXPOSE 3000

# Define the command to run the application
CMD ["node", "index.js"]
