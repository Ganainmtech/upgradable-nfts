import { useState } from "react";
import algosdk from "algosdk";
import { toast } from "react-toastify";
import { useAtom } from 'jotai';
import { atomWithStorage, RESET } from 'jotai/utils';
import { Button } from "@mui/material";
import {
  getNodeURL,
  createARC19AssetMintArray,
  signGroupTransactions,
  sliceIntoChunks,
  pinImageToPinata,
} from "../utils";

// Atoms to manage state with Jotai
const simpleMintAtom = atomWithStorage('simpleMint', {
  name: "",
  unitName: "",
  totalSupply: 1,
  decimals: 0,
  image: null,
  jwtToken: "", // Added field for JWT token
  freeze: false,
  clawback: false,
  defaultFrozen: false,
  external_url: "",
  description: "",
  traits: [
    {
      id: 1,
      category: "",
      name: "",
    },
  ],
  filters: [
    {
      id: 1,
      category: "",
      name: "",
    },
  ],
  extras: [
    {
      id: 1,
      category: "",
      name: "",
    },
  ],
});

const smTokenAtom = atomWithStorage('smToken', "");

export function SimpleMint() {
  const [formData, setFormData] = useAtom(simpleMintAtom);
  const [token, setToken] = useAtom(smTokenAtom);
  const [processStep, setProcessStep] = useState(0);
  const [transaction, setTransaction] = useState(null);
  const [createdAssetID, setCreatedAssetID] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
    }
  };

  const TraitMetadataInputField = (id, type) => {
    return (
      <div key={id} id={`metadata-${id}`} className="mb-2">
        <input
          type="text"
          id={`category-${id}`}
          placeholder={type.slice(0, -1)}
          className="w-24 md:w-28 bg-gray-300 text-sm font-medium text-center leading-none text-black placeholder:text-black/30 placeholder:text-xs px-3 py-2 border rounded border-gray-200"
          value={formData[type].find((metadata) => metadata.id === id).category}
          onChange={(e) => {
            const newMetadata = formData[type].map((trait) => {
              if (trait.id === id) {
                return {
                  ...trait,
                  category: e.target.value,
                };
              }
              return trait;
            });
            setFormData({
              ...formData,
              [type]: newMetadata,
            });
          }}
        />
        <input
          id={`name-${id}`}
          type="text"
          placeholder="value"
          className="w-24 md:w-28 bg-gray-300 text-sm ml-2 font-medium text-center leading-none text-black placeholder:text-black/30 placeholder:text-sm px-3 py-2 border rounded border-gray-200"
          value={formData[type].find((metadata) => metadata.id === id).name}
          onChange={(e) => {
            const newMetadata = formData[type].map((trait) => {
              if (trait.id === id) {
                return {
                  ...trait,
                  name: e.target.value,
                };
              }
              return trait;
            });
            setFormData({
              ...formData,
              [type]: newMetadata,
            });
          }}
        />
        <button
          className="rounded bg-primary-red text-lg hover:bg-red-600 transition text-white ml-2 px-4"
          onClick={() => {
            const newMetadata = formData[type].filter(
              (metadata) => metadata.id !== id
            );
            setFormData({
              ...formData,
              [type]: newMetadata,
            });
          }}
        >
          -
        </button>
      </div>
    );
  };

  async function mint() {
    try {
      const wallet = localStorage.getItem("wallet");
      if (!wallet) {
        toast.error("Please connect your wallet");
        return;
      }

      // Validation for required fields
      if (
        formData.name.trim() === "" ||
        formData.unitName.trim() === "" ||
        formData.totalSupply === "" ||
        formData.decimals === "" ||
        !formData.image ||
        !formData.jwtToken.trim() // Check for JWT token
      ) {
        console.log("Validation failed - check individual fields:");
        console.log("Name:", formData.name);
        console.log("Unit Name:", formData.unitName);
        console.log("Total Supply:", formData.totalSupply);
        console.log("Decimals:", formData.decimals);
        console.log("Image:", formData.image);
        console.log("JWT Token:", formData.jwtToken);
        toast.error("Please fill all the required fields");
        return;
      }
      
      setProcessStep(1);

      // Prepare metadata
      let metadata = {
        name: formData.name,
        standard: "arc19",
        properties: {},
      };

      // Optional fields
      if (formData.external_url.trim()) {
        metadata.external_url = formData.external_url;
      }
      if (formData.description.trim()) {
        metadata.description = formData.description;
      }

      // Traits, Filters, and Extras are optional
      if (formData.traits.length > 0) {
        metadata.properties.traits = formData.traits.reduce((acc, trait) => {
          if (trait.category.trim() && trait.name.trim()) {
            acc[trait.category] = trait.name;
          }
          return acc;
        }, {});
      }
      if (formData.filters.length > 0) {
        metadata.properties.filters = formData.filters.reduce((acc, filter) => {
          if (filter.category.trim() && filter.name.trim()) {
            acc[filter.category] = filter.name;
          }
          return acc;
        }, {});
      }
      if (formData.extras.length > 0) {
        metadata.properties.extras = formData.extras.reduce((acc, extra) => {
          if (extra.category.trim() && extra.name.trim()) {
            acc[extra.category] = extra.name;
          }
          return acc;
        }, {});
      }

      toast.info("Uploading the image to IPFS...");
      const imageURL = "ipfs://" + (await pinImageToPinata(formData.jwtToken, formData.image));

      // Handle image or video type
      if (formData.image.type.includes("video")) {
        metadata.animation_url = imageURL;
        metadata.animation_url_mime_type = formData.image.type;
      } else {
        metadata.image = imageURL;
        metadata.image_mime_type = formData.image.type;
      }

      // Construct metadata for IPFS
      const metadataForIPFS = {
        asset_name: formData.name,
        unit_name: formData.unitName,
        has_clawback: formData.clawback ? "Y" : "N",
        has_freeze: formData.freeze ? "Y" : "N",
        default_frozen: formData.defaultFrozen ? "Y" : "N",
        decimals: formData.decimals,
        total_supply: formData.totalSupply,
        ipfs_data: metadata,
      };

      // Create transaction
      const nodeURL = getNodeURL();
      const unsignedAssetTransaction = await createARC19AssetMintArray(
        [metadataForIPFS],
        nodeURL,
        formData.jwtToken // Use JWT token here
      );

      if (unsignedAssetTransaction.length === 0) {
        toast.error("Something went wrong while creating transactions");
        return;
      }

      setTransaction(unsignedAssetTransaction); // Set transaction state
      setProcessStep(2); // Update process step to 2
      toast.info("Please sign the transaction");
      console.log("Transaction created, processStep set to 2");

    } catch (error) {
      console.error(error);
      toast.error("Something went wrong!");
      setProcessStep(0); // Reset on error
    }
  }

  // Function used to wait for a tx confirmation
const waitForConfirmation = async function (algodclient, txId) {
  let response = await algodclient.status().do();
  let lastround = response["last-round"];
  while (true) {
      const pendingInfo = await algodclient.pendingTransactionInformation(txId).do();
      if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
          //Got the completed Transaction
          console.log("Transaction " + txId + " confirmed in round " + pendingInfo["confirmed-round"]);
          break;
      }
      lastround++;
      await algodclient.statusAfterBlock(lastround).do();
  }
};

  async function sendTransaction() {
    try {
      const wallet = localStorage.getItem("wallet");
      if (!wallet) {
        toast.error("Please connect your wallet");
        return;
      }
      if (!transaction) {
        toast.error("Please create the transaction first");
        return;
      }
      setProcessStep(3);
  
      const nodeURL = getNodeURL();
      const algodClient = new algosdk.Algodv2("", nodeURL, {
        "User-Agent": "evil-tools",
      });
  
      const signedAssetTransaction = await signGroupTransactions(
        transaction,
        wallet,
        true
      );
  
      if (!signedAssetTransaction) {
        setProcessStep(2);
        toast.error("Transaction not signed!");
        return;
      }
  
      const groups = sliceIntoChunks(signedAssetTransaction, 2);
      console.log("Groups to be sent: ", groups);
  
      const { txId } = await algodClient.sendRawTransaction(groups[0]).do();
      console.log("Transaction ID: ", txId);
  
      // Wait for the transaction to be confirmed
      await waitForConfirmation(algodClient, txId);
  
      // Get the new asset's information from the creator account
      const ptx = await algodClient.pendingTransactionInformation(txId).do();
      const assetID = ptx["asset-index"];
  
      if (assetID) {
        toast.success(`NFT minted successfully with asset id: ${assetID}`);
        setCreatedAssetID(assetID);
        setTransaction(null);
        setFormData(RESET); // Reset form after successful minting
        setProcessStep(0); // Reset process step
      } else {
        toast.error("Transaction completed, but asset ID not found.");
        setProcessStep(0);
      }
    } catch (error) {
      console.error("Error occurred during transaction:", error);
      toast.error("Something went wrong during the transaction.");
      setProcessStep(2);
    }
  }  

  return (
    <div className="w-full flex justify-center py-5">
      <div className="max-w-4xl w-full flex flex-col items-center">
        <div className="w-full flex justify-center mb-4">
          {/* Placeholder for a title or other elements */}
        </div>
  
        <div className="minting-container">
          {selectedImage && (
            <div className="image-preview mb-6 flex justify-center">
              <img
                src={selectedImage}
                alt="NFT Preview"
                className="w-full max-w-xs rounded-md border border-gray-600"
              />
            </div>
          )}
  
          <form className="minting-form">
            {/* Name and Unit Name Fields */}
            <div className="flex flex-col space-y-6">
              <div className="flex flex-col md:flex-row md:space-x-6">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Asset Name *"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
  
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Unit Name *"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
                    value={formData.unitName}
                    onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                  />
                </div>
              </div>
            </div>
  
            {/* Total Supply and Decimals Fields */}
            <div className="flex flex-col md:flex-row gap-6 mt-6">
              <input
                type="number"
                placeholder="Total Supply *"
                className="w-full md:w-1/2 p-2 border rounded"
                value={formData.totalSupply}
                onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })}
              />
              <input
                type="number"
                placeholder="Decimals *"
                className="w-full md:w-1/2 p-2 border rounded"
                value={formData.decimals}
                onChange={(e) => setFormData({ ...formData, decimals: e.target.value })}
              />
            </div>
  
            {/* Image Upload Field */}
            <div className="flex flex-col md:flex-row gap-6 mt-6">
              <input
                type="file"
                accept="image/*,video/*"
                className="w-full md:w-1/2 p-2 border rounded"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setFormData({ ...formData, image: file });
                    setSelectedImage(URL.createObjectURL(file));
                  }
                }}
              />
              <input
                type="text"
                placeholder="JWT Token *"
                className="w-full md:w-1/2 p-2 border rounded"
                value={formData.jwtToken}
                onChange={(e) => setFormData({ ...formData, jwtToken: e.target.value })}
              />
              </div>
  
            {/* Traits, Filters, and Extras Sections */}
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold md:flex-row gap-6 mt-6">Traits</h2>
              {formData.traits.map((trait) => TraitMetadataInputField(trait.id, "traits"))}
              <button
                type="button"
                className="w-full bg-blue-500 text-white p-2 rounded"
                onClick={() => {
                  setFormData({
                    ...formData,
                    traits: [
                      ...formData.traits,
                      { id: formData.traits.length + 1, category: "", name: "" },
                    ],
                  });
                }}
              >
                Add Trait
              </button>
            </div>
  
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold md:flex-row gap-6 mt-6">Filters</h2>
              {formData.filters.map((filter) => TraitMetadataInputField(filter.id, "filters"))}
              <button
                type="button"
                className="w-full bg-blue-500 text-white p-2 rounded"
                onClick={() => {
                  setFormData({
                    ...formData,
                    filters: [
                      ...formData.filters,
                      { id: formData.filters.length + 1, category: "", name: "" },
                    ],
                  });
                }}
              >
                Add Filter
              </button>
            </div>
  
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold md:flex-row gap-6 mt-6">Extras</h2>
              {formData.extras.map((extra) => TraitMetadataInputField(extra.id, "extras"))}
              <button
                type="button"
                className="w-full bg-blue-500 text-white p-2 rounded"
                onClick={() => {
                  setFormData({
                    ...formData,
                    extras: [
                      ...formData.extras,
                      { id: formData.extras.length + 1, category: "", name: "" },
                    ],
                  });
                }}
              >
                Add Extra
              </button>
            </div>
  
            {/* Submit and Sign & Mint Buttons */}
            <div className="flex justify-center gap-4 mt-4">
              <Button
                type="submit"
                variant="contained"
                color="primary"
                onClick={mint}
                disabled={processStep !== 0}
              >
                Upload IPFS
              </Button>
  
              <Button
                type="button"
                variant="contained"
                color="primary"
                onClick={sendTransaction}
                disabled={processStep !== 2 || !transaction}
              >
                Sign & Mint
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
