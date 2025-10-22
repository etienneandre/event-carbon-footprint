# Event Carbon Footprint

A web application to calculate and visualize the carbon footprint of scientific events.

---

## Installation

- Clone the repository  
```bash
  git clone https://github.com/etienneandre/event-carbon-footprint.git  
  cd event-carbon-footprint
```

- Check your Node.js version  
```bash
  node -v  
```
  - If your version is **lower than 18**, upgrade to Node 20:  
  ```bash
    nvm install 20  
    nvm use 20  
  ```
  - Or install it via your package manager, depending on your system:  
    - **Windows** → download the installer from the official website  
    - **Linux/macOS** → use the commands above with `nvm`  
  - See this guide for more details: [How to install Node.js](https://kinsta.com/blog/how-to-install-node-js/)  
    > Recommended: Node.js **v20 or higher**

- Clean and reinstall dependencies (after upgrading Node.js)  
```bash
  rm -rf node_modules package-lock.json  
  npm install
```

- Start the development server
```bash  
  npm run dev
```

---

Once the server is running, open your browser and navigate to: http://localhost:5173/

---

## Additional Information

- **Environment:** Built with [Vite](https://vitejs.dev/)  
- **Port:** Defaults to `5173` (configurable in project settings)  
- **Node Version:** Use **v20+** for best compatibility  

If you encounter any issues, feel free to open an issue or reach out to the team.

---

## License

This project is licensed under the MIT License.