export type DevicePresetKey = "PIXEL_7" | "GALAXY_S24" | "IPHONE_15_PRO" | "DESKTOP" | "CUSTOM";

export type DeviceProfile = {
  key: DevicePresetKey;
  label: string;
  userAgent: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  platform: string;
  secChUaPlatform: string;
  secChUaMobile: string;
  modelName?: string;
};

export const DEVICE_PRESETS: Record<Exclude<DevicePresetKey, "CUSTOM">, DeviceProfile> = {
  PIXEL_7: {
    key: "PIXEL_7",
    label: "Google Pixel 7 (Android 14)",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    platform: "Linux armv81",
    secChUaPlatform: "Android",
    secChUaMobile: "?1",
    modelName: "Pixel 7 Pro",
  },
  GALAXY_S24: {
    key: "GALAXY_S24",
    label: "Samsung Galaxy S24 (Android 14)",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 3.0,
    isMobile: true,
    hasTouch: true,
    platform: "Linux aarch64",
    secChUaPlatform: "Android",
    secChUaMobile: "?1",
    modelName: "SM-S921B",
  },
  IPHONE_15_PRO: {
    key: "IPHONE_15_PRO",
    label: "Apple iPhone 15 Pro (iOS 17.5)",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3.0,
    isMobile: true,
    hasTouch: true,
    platform: "iPhone",
    secChUaPlatform: "iOS",
    secChUaMobile: "?1",
    modelName: "iPhone",
  },
  DESKTOP: {
    key: "DESKTOP",
    label: "Desktop Chrome (Windows 11)",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.0,
    isMobile: false,
    hasTouch: false,
    platform: "Win32",
    secChUaPlatform: "Windows",
    secChUaMobile: "?0",
  },
};

export type DeviceConfigInput = {
  devicePreset?: string | null;
  customUserAgent?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  deviceScaleFactor?: number | null;
  isMobile?: boolean | null;
  hasTouch?: boolean | null;
};

export function resolveDeviceConfig(input?: DeviceConfigInput | null): DeviceProfile {
  const presetKey = (input?.devicePreset?.toUpperCase() || "PIXEL_7") as DevicePresetKey;
  const base = DEVICE_PRESETS[presetKey as keyof typeof DEVICE_PRESETS] || DEVICE_PRESETS.PIXEL_7;

  if (presetKey === "CUSTOM" || input?.customUserAgent || input?.viewportWidth || input?.viewportHeight) {
    const width = input?.viewportWidth && input.viewportWidth > 0 ? input.viewportWidth : base.viewport.width;
    const height = input?.viewportHeight && input.viewportHeight > 0 ? input.viewportHeight : base.viewport.height;
    const isMobile = input?.isMobile !== undefined && input?.isMobile !== null ? input.isMobile : base.isMobile;
    const hasTouch = input?.hasTouch !== undefined && input?.hasTouch !== null ? input.hasTouch : base.hasTouch;

    return {
      key: "CUSTOM",
      label: "Custom Device",
      userAgent: input?.customUserAgent?.trim() || base.userAgent,
      viewport: { width, height },
      deviceScaleFactor: input?.deviceScaleFactor && input.deviceScaleFactor > 0 ? input.deviceScaleFactor : base.deviceScaleFactor,
      isMobile,
      hasTouch,
      platform: isMobile ? (base.platform.includes("iPhone") ? "iPhone" : "Linux armv81") : "Win32",
      secChUaPlatform: isMobile ? (base.secChUaPlatform === "iOS" ? "iOS" : "Android") : "Windows",
      secChUaMobile: isMobile ? "?1" : "?0",
      modelName: isMobile ? (base.modelName || "Mobile Device") : undefined,
    };
  }

  return base;
}

/**
 * Returns raw JS stealth script string for Playwright initScript injection
 * so that bundler/compiler helpers like __name don't interfere in browser context.
 */
export function generateDeviceStealthScript(device: DeviceProfile): string {
  const isAndroid = device.secChUaPlatform === "Android";
  const modelName = device.modelName || "Pixel 7";
  const touchPoints = device.hasTouch ? 5 : 0;

  return `
    (function() {
      function safeDefine(target, prop, getter) {
        if (!target) return;
        try {
          Object.defineProperty(target, prop, {
            get: getter,
            configurable: true,
            enumerable: true
          });
        } catch (e) {}
      }

      var proto = typeof Navigator !== "undefined" ? Navigator.prototype : (Object.getPrototypeOf(navigator) || {});

      // 1. Webdriver
      safeDefine(navigator, "webdriver", function() { return undefined; });
      safeDefine(proto, "webdriver", function() { return undefined; });

      // 2. Languages & plugins
      safeDefine(navigator, "languages", function() { return ["it-IT", "it", "en-US", "en"]; });
      safeDefine(proto, "languages", function() { return ["it-IT", "it", "en-US", "en"]; });
      safeDefine(navigator, "plugins", function() { return [1, 2, 3, 4, 5]; });
      safeDefine(proto, "plugins", function() { return [1, 2, 3, 4, 5]; });

      // 3. Platform
      safeDefine(navigator, "platform", function() { return ${JSON.stringify(device.platform)}; });
      safeDefine(proto, "platform", function() { return ${JSON.stringify(device.platform)}; });

      // 4. Max touch points & touch events
      safeDefine(navigator, "maxTouchPoints", function() { return ${touchPoints}; });
      safeDefine(proto, "maxTouchPoints", function() { return ${touchPoints}; });

      ${
        device.hasTouch
          ? `
        try {
          if (!("ontouchstart" in window)) {
            window.ontouchstart = null;
          }
        } catch (e) {}
      `
          : ""
      }

      // 5. Screen dimensions matching device viewport
      try {
        var w = ${device.viewport.width};
        var h = ${device.viewport.height};
        safeDefine(screen, "width", function() { return w; });
        safeDefine(screen, "height", function() { return h; });
        safeDefine(screen, "availWidth", function() { return w; });
        safeDefine(screen, "availHeight", function() { return h; });
        safeDefine(screen, "colorDepth", function() { return 24; });
        safeDefine(screen, "pixelDepth", function() { return 24; });
        if (${device.isMobile} && screen.orientation) {
          safeDefine(screen.orientation, "type", function() { return "portrait-primary"; });
          safeDefine(screen.orientation, "angle", function() { return 0; });
        }
      } catch (e) {}

      // 6. Permissions query
      try {
        var origQuery = window.navigator.permissions && window.navigator.permissions.query;
        if (origQuery) {
          window.navigator.permissions.query = function(params) {
            return params && params.name === "notifications"
              ? Promise.resolve({ state: Notification.permission })
              : origQuery.call(window.navigator.permissions, params);
          };
        }
      } catch (e) {}

      // 7. Client Hints (userAgentData) for Chrome Android
      ${
        isAndroid
          ? `
      try {
        var brands = [
          { brand: "Google Chrome", version: "130" },
          { brand: "Chromium", version: "130" },
          { brand: "Not?A_Brand", version: "24" }
        ];
        var uad = {
          brands: brands,
          mobile: true,
          platform: "Android",
          getHighEntropyValues: function() {
            return Promise.resolve({
              architecture: "arm",
              bitness: "64",
              brands: brands,
              mobile: true,
              model: ${JSON.stringify(modelName)},
              platform: "Android",
              platformVersion: "14.0.0",
              uaFullVersion: "130.0.6723.86"
            });
          },
          toJSON: function() { return { brands: brands, mobile: true, platform: "Android" }; }
        };
        safeDefine(navigator, "userAgentData", function() { return uad; });
        safeDefine(proto, "userAgentData", function() { return uad; });
      } catch (e) {}
      `
          : ""
      }
    })();
  `;
}
