// src/CarouselComponent.js
import React, { useState } from "react";

const CarouselComponent = ({ images, style }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 1000); 
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="mx-auto my-0 md:my-0">
      <div>
        {images.map((image, index) => (
          <a href={image.url} target="_blank" rel="noreferrer" key={index}>
            <img
              src={image.path}
              alt={`carousel-image-${index}`}
              className={`${
                index === currentIndex ? "block" : "hidden"
              } h-20 md:h-24 mx-auto rounded-md`}
              style={style}
            />
          </a>
        ))}
      </div>
    </div>
  );
};

export default CarouselComponent;
