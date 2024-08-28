import { useState } from "react";
import { SimpleMint } from "./SimpleMint";
import { SimpleUpdate } from "./SimpleUpdate";

export function SelectToolComponent() {
  const [uploadedImage, setUploadedImage] = useState(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="text-center">
      <div className="container mx-auto grid lg:grid-cols-2 gap-8"> {/* Increased gap for spacing */}
        {/* Left-hand side ARC-19 minting section */}
        <div className="col-span-2 xl:col-span-1 flex justify-center"> {/* Center the content */}
          <div className="rounded-lg shadow bg-[#2b2a2a] border border-[#201f1f] p-8">
            <h5 className="mb-4 text-2xl font-bold tracking-tight text-white">
              Mint ARC-19 NFT
            </h5>
            <SimpleMint />
          </div>
        </div>

        {/* Right-hand side ARC-19 update section */}
        <div className="col-span-2 xl:col-span-1 flex justify-center"> {/* Center the content */}
          <div className="rounded-lg shadow bg-[#2b2a2a] border border-[#201f1f] p-8">
            <h5 className="mb-4 text-2xl font-bold tracking-tight text-white">
              Update ARC-19 NFT
            </h5>
            <SimpleUpdate />
          </div>
        </div>
      </div>
    </div>
  );
}
