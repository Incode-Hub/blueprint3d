"use client";

import React, { useState, useMemo } from "react";
import { items } from "../data/items";
import { useBlueprint3D } from "../context/Blueprint3DContext";

type Item = (typeof items)[0];

type Category = {
  name: string;
  icon: string;
  items: Item[];
};

export default function AddItems() {
  const { blueprint3d, appState, setAppState } = useBlueprint3D();
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [formatFilter, setFormatFilter] = useState<string>("all");

  const categories = useMemo(() => {
    const filteredItems = items.filter((item) => {
      if (formatFilter === "all") return true;
      // @ts-ignore
      return item.format === formatFilter || !item.format;
    });

    const cats: Record<string, Category> = {
      Furniture: {
        name: "Furniture",
        icon: "glyphicon-bed",
        items: filteredItems.filter(
          (item) =>
            item.name.includes("Chair") ||
            item.name.includes("Sofa") ||
            item.name.includes("Sectional")
        ),
      },
      Storage: {
        name: "Storage",
        icon: "glyphicon-folder-close",
        items: filteredItems.filter(
          (item) =>
            item.name.includes("Dresser") ||
            item.name.includes("Wardrobe") ||
            item.name.includes("Bookshelf") ||
            item.name.includes("Trunk")
        ),
      },
      Tables: {
        name: "Tables",
        icon: "glyphicon-th-large",
        items: filteredItems.filter(
          (item) => item.name.includes("table") || item.name.includes("Table")
        ),
      },
      Bedroom: {
        name: "Bedroom",
        icon: "glyphicon-home",
        items: filteredItems.filter((item) => item.name.includes("Bed")),
      },
      Electronics: {
        name: "Electronics",
        icon: "glyphicon-blackboard",
        items: filteredItems.filter((item) =>
          item.name.includes("Media Console")
        ),
      },
      Lighting: {
        name: "Lighting",
        icon: "glyphicon-flash",
        items: filteredItems.filter((item) => item.name.includes("Lamp")),
      },
      "Doors & Windows": {
        name: "Doors & Windows",
        icon: "glyphicon-log-in",
        items: filteredItems.filter(
          (item) => item.name.includes("Door") || item.name.includes("Window")
        ),
      },
      Decorative: {
        name: "Decorative",
        icon: "glyphicon-picture",
        items: filteredItems.filter(
          (item) => item.name.includes("Rug") || item.name.includes("Poster")
        ),
      },
      Bathroom: {
        name: "Bathroom",
        icon: "glyphicon-tint",
        items: filteredItems.filter(
          (item) => item.name.includes("Kepler") || item.name.includes("Bath")
        ),
      },
    };

    return cats;
  }, [formatFilter]);

  const handleCategoryClick = (categoryName: string) => {
    setCurrentCategory(categoryName);
  };

  const handleBackClick = () => {
    setCurrentCategory(null);
  };

  const handleAddItem = (item: Item) => {
    if (!blueprint3d) return;

    const metadata = {
      itemName: item.name,
      resizable: true,
      modelUrl: item.model,
      // @ts-ignore
      itemType: parseInt(item.type, 10),
      thumbnailUrl: item.image,
    };

    // @ts-ignore
    blueprint3d.model.scene.addItem(
      parseInt(item.type, 10),
      item.model,
      metadata
    );
    setAppState("VIEWER");
  };

  // Explicitly set display: 'block' to ensure visibility
  const style: React.CSSProperties =
    appState === "ADD_ITEMS"
      ? { display: "block", height: "100%", overflowY: "auto" }
      : { display: "none" };

  return (
    <div id="add-items" style={style}>
      <div className="row" id="items-wrapper">
        {!currentCategory ? (
          // Categories View
          Object.values(categories).map((category) =>
            category.items.length > 0 ? (
              <div
                key={category.name}
                className="col-sm-6 col-md-4"
                style={{ marginBottom: "15px" }}
              >
                <a
                  href="#"
                  className="thumbnail category-folder"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCategoryClick(category.name);
                  }}
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    transition: "all 0.2s ease",
                    border: "2px solid #ddd",
                    display: "block",
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: "48px",
                      color: "#337ab7",
                      marginBottom: "10px",
                    }}
                  >
                    <span className={`glyphicon ${category.icon}`}></span>
                  </div>
                  <h5 style={{ margin: 0, fontWeight: "bold", color: "#333" }}>
                    {category.name}
                  </h5>
                  <small className="text-muted">
                    ({category.items.length} items)
                  </small>
                </a>
              </div>
            ) : null
          )
        ) : (
          // Items View
          <>
            <div className="col-xs-12" style={{ marginBottom: "20px" }}>
              <div className="row">
                <div className="col-xs-2">
                  <button
                    className="btn btn-default btn-sm"
                    onClick={handleBackClick}
                  >
                    <span className="glyphicon glyphicon-arrow-left"></span>{" "}
                    Back
                  </button>
                </div>
                <div className="col-xs-8 text-center">
                  <h4 style={{ margin: "5px 0", color: "#666" }}>
                    <span
                      className={`glyphicon ${categories[currentCategory].icon}`}
                    ></span>{" "}
                    {currentCategory}
                  </h4>
                </div>
              </div>
            </div>
            {categories[currentCategory].items.map((item) => (
              <div
                key={item.name}
                className="col-sm-6 col-md-4"
                style={{ marginBottom: "15px" }}
              >
                <a
                  className="thumbnail add-item"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddItem(item);
                  }}
                  style={{
                    textAlign: "center",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    display: "block",
                    textDecoration: "none",
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ maxHeight: "120px", objectFit: "cover" }}
                  />
                  <div style={{ padding: "10px" }}>
                    <strong>{item.name}</strong>
                  </div>
                </a>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
