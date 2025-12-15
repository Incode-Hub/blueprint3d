"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface Blueprint3DContextType {
  blueprint3d: any;
  loaded: boolean;
  appState: "VIEWER" | "FLOORPLANNER" | "ADD_ITEMS";
  setAppState: (state: "VIEWER" | "FLOORPLANNER" | "ADD_ITEMS") => void;
}

const Blueprint3DContext = createContext<Blueprint3DContextType>({
  blueprint3d: null,
  loaded: false,
  appState: "VIEWER",
  setAppState: () => {},
});

export const useBlueprint3D = () => useContext(Blueprint3DContext);

export const Blueprint3DProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [blueprint3d, setBlueprint3d] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [appState, setAppState] = useState<
    "VIEWER" | "FLOORPLANNER" | "ADD_ITEMS"
  >("VIEWER");

  useEffect(() => {
    // Wait for BP3D to be loaded from script tags
    const init = () => {
      // Check if BP3D is available globally
      if (typeof (window as any).BP3D === "undefined") {
        console.log("BP3D not yet loaded, retrying...");
        setTimeout(init, 100);
        return;
      }

      // Check if DOM elements exist
      if (
        !document.getElementById("viewer") ||
        !document.getElementById("floorplanner-canvas")
      ) {
        console.log("DOM elements not ready, retrying...");
        setTimeout(init, 100);
        return;
      }

      const BP3D = (window as any).BP3D;

      const opts = {
        floorplannerElement: "floorplanner-canvas",
        threeElement: "#viewer",
        threeCanvasElement: "three-canvas",
        textureDir: "models/textures/",
        widget: false,
      };

      try {
        const bp3d = new BP3D.Blueprint3d(opts);

        // Load default design
        bp3d.model.loadSerialized(
          '{"floorplan":{"corners":{"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":204.85099999999989,"y":289.052},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":672.2109999999999,"y":289.052},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":672.2109999999999,"y":-178.308},"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":204.85099999999989,"y":-178.308}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[]}'
        );

        setBlueprint3d(bp3d);
        setLoaded(true);

        // Expose globally for debugging
        (window as any).blueprint3d = bp3d;
        console.log("BP3D initialized successfully");
      } catch (e) {
        console.error("Failed to initialize Blueprint3D:", e);
      }
    };

    // Start initialization
    init();
  }, []);

  return (
    <Blueprint3DContext.Provider
      value={{ blueprint3d, loaded, appState, setAppState }}
    >
      {children}
    </Blueprint3DContext.Provider>
  );
};
