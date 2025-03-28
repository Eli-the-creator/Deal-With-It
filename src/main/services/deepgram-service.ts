import { BrowserWindow, ipcMain } from "electron";
import { app } from "electron";
import fs from "fs";
import path from "path";

// Define interface for configuration
interface DeepgramConfig {
  apiKey: string;
}

// Path to store the config
const getConfigPath = () => {
  return path.join(app.getPath("userData"), "deepgram-config.json");
};

// Save config to file
const saveConfigToFile = (config: DeepgramConfig) => {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving DeepGram config to file:", error);
    return false;
  }
};

// Load config from file
const loadConfigFromFile = (): DeepgramConfig | null => {
  try {
    if (fs.existsSync(getConfigPath())) {
      const data = fs.readFileSync(getConfigPath(), "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading DeepGram config from file:", error);
  }
  return null;
};

// Set up DeepGram service
export function setupDeepgramService(mainWindow: BrowserWindow): void {
  console.log("Setting up DeepGram service...");

  // Handle loading config
  ipcMain.handle("load-deepgram-config", async () => {
    try {
      const config = loadConfigFromFile();
      return config || { apiKey: "" };
    } catch (error) {
      console.error("Error loading DeepGram config:", error);
      return { apiKey: "" };
    }
  });

  // Handle saving config
  ipcMain.handle("save-deepgram-config", async (_, config: DeepgramConfig) => {
    try {
      const success = saveConfigToFile(config);
      if (success) {
        // You could set an environment variable or update a global value here
        // to make the API key available to the DeepGram service
        process.env.DEEPGRAM_API_KEY = config.apiKey;

        return { success: true, config };
      } else {
        return {
          success: false,
          error: "Failed to save DeepGram configuration",
        };
      }
    } catch (error) {
      console.error("Error saving DeepGram config:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  // Load initial config
  const initialConfig = loadConfigFromFile();
  if (initialConfig && initialConfig.apiKey) {
    // Set environment variable for other services to use
    process.env.DEEPGRAM_API_KEY = initialConfig.apiKey;
    console.log("DeepGram API key loaded from config");
  }

  console.log("DeepGram service setup complete");
}

// Export utility function to get API key
export function getDeepgramApiKey(): string {
  return process.env.DEEPGRAM_API_KEY || "";
}
