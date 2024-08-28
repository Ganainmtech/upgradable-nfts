import { useState } from "react";
import { useNavigate } from "react-router-dom";
import algosdk from "algosdk";
import { toast } from "react-toastify";
import axios from "axios";
import { useAtom } from 'jotai';
import { atomWithStorage, RESET } from 'jotai/utils';
import { Button } from "@mui/material";
import { pinImageToPinata, getNodeURL, updateARC19AssetMintArray, signGroupTransactions, sliceIntoChunks, getARC19AssetMetadataData, getAssetPreviewURL } from "../utils";
import { IPFS_ENDPOINT } from "../constants";

const simpleUpdateAtom = atomWithStorage('simpleUpdate', {
  name: "",
  unitName: "",
  totalSupply: 1,
  decimals: 0,
  image: null,
  format: "",
  freeze: false,
  clawback: false,
  image_url: "",
  image_mime_type: "",
  description: "",
  external_url: "",
  traits: [],
  filters: [],
  extras: []
});
const suAssetIdAtom = atomWithStorage('suAssetId', "");
const suTokenAtom = atomWithStorage('suToken', "");

export function SimpleUpdate() {
  const [formData, setFormData] = useAtom(simpleUpdateAtom);
  const [token, setToken] = useAtom(suTokenAtom);
  const [processStep, setProcessStep] = useState(0);
  const [transaction, setTransaction] = useState(null);
  const [assetID, setAssetID] = useAtom(suAssetIdAtom);
  const navigate = useNavigate();

  async function getAssetData() {
    try {
      const nodeURL = getNodeURL();
      const assetID = document.getElementById("asset_id").value;
      if (assetID === "") {
        toast.error("Please enter an asset ID");
        return;
      }
      setAssetID(assetID);
      const response = await axios.get(`${nodeURL}/v2/assets/${assetID}`);
      const assetData = response.data;
      const assetMetadata = await getARC19AssetMetadataData(assetData.params["url"], assetData.params["reserve"]);
      
      setFormData({
        ...formData,
        name: assetData.params["name"],
        unitName: assetData.params["unit-name"],
        totalSupply: assetData.params["total"],
        decimals: assetData.params["decimals"],
        freeze: assetData.params["freeze"],
        clawback: assetData.params["clawback"],
        format: "ARC19",
        description: assetMetadata.description || "",
        external_url: assetMetadata.external_url || "",
        traits: Object.keys(assetMetadata.properties.traits || {}).map((key, index) => ({
          id: index,
          category: key,
          name: assetMetadata.properties.traits[key],
        })),
        filters: Object.keys(assetMetadata.properties.filters || {}).map((key, index) => ({
          id: index,
          category: key,
          name: assetMetadata.properties.filters[key],
        })),
        extras: Object.keys(assetMetadata.properties.extras || {}).map((key, index) => ({
          id: index,
          category: key,
          name: assetMetadata.properties.extras[key],
        })),
        image_url: assetMetadata.image || assetData.params["url"],
        image_mime_type: assetMetadata.image_mime_type,
        animation_url: assetMetadata.animation_url || assetData.params["url"],
        animation_mime_type: assetMetadata.animation_mime_type
      });
    } catch (error) {
      toast.error(error.response ? error.response.data.message : error.message);
      setAssetID("");
    }
  }

  async function update() {
    try {
      const wallet = localStorage.getItem("wallet");
      if (!wallet) {
        toast.error("Please connect your wallet");
        return;
      }
      if (formData.name === "" || formData.unitName === "" || formData.totalSupply === "" || formData.decimals === "" || (token === "" && formData.format === "ARC19")) {
        toast.error("Please fill all the required fields");
        return;
      }
      setProcessStep(1);
      let metadata = {
        name: formData.name,
        standard: "arc19",
        properties: {
          traits: formData.traits.reduce((acc, trait) => {
            if (trait.category !== "" && trait.name !== "") {
              acc[trait.category] = trait.name;
            }
            return acc;
          }, {}),
          filters: formData.filters.reduce((acc, filter) => {
            if (filter.category !== "" && filter.name !== "") {
              acc[filter.category] = filter.name;
            }
            return acc;
          }, {}),
          extras: formData.extras.reduce((acc, extra) => {
            if (extra.category !== "" && extra.name !== "") {
              acc[extra.category] = extra.name;
            }
            return acc;
          }, {}),
        }
      };

      if (formData.image && formData.format === "ARC19") {
        const imageURL = "ipfs://" + (await pinImageToPinata(token, formData.image));
        metadata.image = imageURL;
        metadata.image_mime_type = formData.image ? formData.image.type : "";
      } else if (formData.format === "ARC3") {
        throw new Error("ARC3 assets can't be updated");
      } else {
        if (formData.image_mime_type) {
          metadata.image_mime_type = formData.image_mime_type;
        }
        if (formData.image_url) {
          metadata.image = formData.image_url;
        }
        if (formData.animation_url) {
          metadata.animation_url = formData.animation_url;
        }
        if (formData.animation_mime_type) {
          metadata.animation_mime_type = formData.animation_mime_type;
        }
      }

      const nodeURL = getNodeURL();
      const transaction_data = {
        asset_id: assetID,
        ipfs_data: metadata,
        freeze: formData.freeze,
        clawback: formData.clawback,
      };
      const unsignedAssetTransactions = await updateARC19AssetMintArray([transaction_data], nodeURL, token);
      if (unsignedAssetTransactions.length === 0) {
        toast.error("Something went wrong while creating transactions");
        return;
      }
      setTransaction(unsignedAssetTransactions);
      toast.info("Please sign the transaction");
      setProcessStep(2);
    } catch (error) {
      toast.error("Something went wrong!");
      setProcessStep(0);
    }
  }

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
      const algodClient = new algosdk.Algodv2("", nodeURL, { "User-Agent": "evil-tools" });
      const signedAssetTransaction = await signGroupTransactions(transaction, wallet, true);
      if (!signedAssetTransaction) {
        setProcessStep(2);
        toast.error("Transaction not signed!");
        return;
      }
      const groups = sliceIntoChunks(signedAssetTransaction, 2);
      await algodClient.sendRawTransaction(groups[0]).do();
      toast.success("Asset updated successfully!");
      setProcessStep(4);
    } catch (error) {
      toast.error("Something went wrong!");
      setProcessStep(2);
    }
  }

  function removeStoredData() {
    setFormData(RESET);
    setAssetID(RESET);
    setToken(RESET);
  }

  return (
    <div className="mx-auto text-white mb-4 text-center flex flex-col items-center max-w-[40rem] gap-y-2">
      <p className="text-2xl font-bold mt-1">Update ARC19 NFT</p>
      {assetID !== "" && formData.name ? (
        <>
          <div className="mt-4 md:flex items-center text-start gap-x-4">
            <div className="flex flex-col">
              <label className="mb-2 text-sm leading-none text-gray-200">Name</label>
              <input
                className="w-64 bg-gray-400 text-sm font-medium text-center leading-none text-black placeholder:text-black/30 px-3 py-2 border rounded border-gray-400 disabled:cursor-not-allowed"
                value={formData.name}
                disabled
              />
            </div>
            <div className="flex flex-col md:mt-0 mt-4">
              <label className="mb-2 text-sm leading-none text-gray-200">Unit name</label>
              <input
                className="w-64 bg-gray-400 text-sm font-medium text-center leading-none text-black placeholder:text-black/30 px-3 py-2 border rounded border-gray-400 disabled:cursor-not-allowed"
                value={formData.unitName}
                disabled
              />
            </div>
          </div>
          <div className="mt-4 md:flex items-center text-start gap-x-4">
            <div className="flex flex-col">
              <label className="mb-2 text-sm leading-none text-gray-200">Total supply</label>
              <input
                className="w-64 bg-gray-400 text-sm font-medium text-center leading-none text-black placeholder:text-black/30 px-3 py-2 border rounded border-gray-400 disabled:cursor-not-allowed"
                value={formData.totalSupply}
                disabled
              />
            </div>
            <div className="flex flex-col md:mt-0 mt-4">
              <label className="mb-2 text-sm leading-none text-gray-200">Decimals</label>
              <input
                className="w-64 bg-gray-400 text-sm font-medium text-center leading-none text-black placeholder:text-black/30 px-3 py-2 border rounded border-gray-400 disabled:cursor-not-allowed"
                value={formData.decimals}
                disabled
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-2 text-sm leading-none text-gray-200">Description</label>
            <textarea
              className="w-full bg-gray-400 text-sm font-medium text-center leading-none text-black placeholder:text-black/30 px-3 py-2 border rounded border-gray-400 disabled:cursor-not-allowed"
              value={formData.description}
              disabled
            />
          </div>
          <div className="mt-4">
            <label className="mb-2 text-sm leading-none text-gray-200">External URL</label>
            <input
              className="w-full bg-gray-400 text-sm font-medium text-center leading-none text-black placeholder:text-black/30 px-3 py-2 border rounded border-gray-400 disabled:cursor-not-allowed"
              value={formData.external_url}
              disabled
            />
          </div>
          <div className="flex mt-4 gap-2">
            <Button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={update}
            >
              Update
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              onClick={removeStoredData}
            >
              Clear
            </Button>
          </div>
        </>
      ) : (
        <div>
          <input
            id="asset_id"
            className="bg-gray-400 text-sm font-medium text-center leading-none text-black placeholder:text-black/30 px-3 py-2 border rounded border-gray-400"
            placeholder="Enter Asset ID"
          />
          <Button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-4"
            onClick={getAssetData}
          >
            Fetch Asset Data
          </Button>
        </div>
      )}
      {processStep > 0 && (
        <div className="mt-4">
          {processStep === 1 && <p>Processing update...</p>}
          {processStep === 2 && <p>Signing transaction...</p>}
          {processStep === 3 && <p>Sending transaction...</p>}
          {processStep === 4 && <p>Update complete!</p>}
        </div>
      )}
    </div>
  );
}
