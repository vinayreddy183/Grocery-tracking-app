const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;
const dataPath = path.join(__dirname, 'data.json');

// Initialize data file if it doesn't exist
async function initializeDataFile() {
  try {
    await fs.access(dataPath);
  } catch (error) {
    // File doesn't exist, create it
    const initialData = {
      groceries: [],
      categories: ['Vegetables', 'Fruits', 'Dairy', 'Grains', 'Meat', 'Snacks', 'Beverages', 'Other']
    };
    await fs.writeFile(dataPath, JSON.stringify(initialData, null, 2));
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default'
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
  await initializeDataFile();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for data operations
ipcMain.handle('load-data', async () => {
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading data:', error);
    return { groceries: [], categories: [] };
  }
});

ipcMain.handle('save-data', async (event, data) => {
  try {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving data:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-grocery', async (event, grocery) => {
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    const parsedData = JSON.parse(data);
    
    grocery.id = Date.now().toString();
    grocery.createdAt = new Date().toISOString();
    
    parsedData.groceries.push(grocery);
    
    await fs.writeFile(dataPath, JSON.stringify(parsedData, null, 2));
    return { success: true, grocery };
  } catch (error) {
    console.error('Error adding grocery:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-grocery-price', async (event, { id, price, date }) => {
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    const parsedData = JSON.parse(data);
    
    const grocery = parsedData.groceries.find(g => g.id === id);
    if (!grocery) {
      return { success: false, error: 'Grocery not found' };
    }
    
    if (!grocery.priceHistory) {
      grocery.priceHistory = [];
    }
    
    // Remove existing entry for the same date
    grocery.priceHistory = grocery.priceHistory.filter(entry => entry.date !== date);
    
    // Add new price entry
    grocery.priceHistory.push({ date, price: parseFloat(price) });
    grocery.priceHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Update current price
    grocery.currentPrice = parseFloat(price);
    grocery.lastUpdated = new Date().toISOString();
    
    await fs.writeFile(dataPath, JSON.stringify(parsedData, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error updating price:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-grocery', async (event, id) => {
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    const parsedData = JSON.parse(data);
    
    parsedData.groceries = parsedData.groceries.filter(g => g.id !== id);
    
    await fs.writeFile(dataPath, JSON.stringify(parsedData, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error deleting grocery:', error);
    return { success: false, error: error.message };
  }
});