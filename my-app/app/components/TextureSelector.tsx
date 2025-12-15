"use client";

import React from "react";

export default function TextureSelector() {
  return (
    <>
      {/* Floor textures */}
      <div id="floorTexturesDiv" style={{ display: "none", padding: "0 20px" }}>
        <div className="panel panel-default">
          <div className="panel-heading">Adjust Floor</div>
          <div className="panel-body" style={{ color: "#333" }}>
            <div className="col-sm-6" style={{ padding: "3px" }}>
              <a
                href="#"
                className="thumbnail texture-select-thumbnail"
                // @ts-ignore
                texture-url="rooms/textures/light_fine_wood.jpg"
                texture-stretch="false"
                texture-scale="300"
              >
                <img
                  alt="Thumb light fine wood"
                  src="rooms/thumbnails/thumbnail_light_fine_wood.jpg"
                />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Wall textures */}
      <div id="wallTextures" style={{ display: "none", padding: "0 20px" }}>
        <div className="panel panel-default">
          <div className="panel-heading">Adjust Wall</div>
          <div className="panel-body" style={{ color: "#333" }}>
            <div className="col-sm-6" style={{ padding: "3px" }}>
              <a
                href="#"
                className="thumbnail texture-select-thumbnail"
                // @ts-ignore
                texture-url="rooms/textures/marbletiles.jpg"
                texture-stretch="false"
                texture-scale="300"
              >
                <img
                  alt="Thumb marbletiles"
                  src="rooms/thumbnails/thumbnail_marbletiles.jpg"
                />
              </a>
            </div>
            <div className="col-sm-6" style={{ padding: "3px" }}>
              <a
                href="#"
                className="thumbnail texture-select-thumbnail"
                // @ts-ignore
                texture-url="rooms/textures/wallmap_yellow.png"
                texture-stretch="true"
                texture-scale=""
              >
                <img
                  alt="Thumb yellow"
                  src="rooms/thumbnails/thumbnail_wallmap_yellow.png"
                />
              </a>
            </div>
            <div className="col-sm-6" style={{ padding: "3px" }}>
              <a
                href="#"
                className="thumbnail texture-select-thumbnail"
                // @ts-ignore
                texture-url="rooms/textures/light_brick.jpg"
                texture-stretch="false"
                texture-scale="100"
              >
                <img
                  alt="Thumb brick"
                  src="rooms/thumbnails/thumbnail_light_brick.jpg"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
