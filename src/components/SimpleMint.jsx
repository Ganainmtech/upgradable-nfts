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

const simpleMintAtom = atomWithStorage('simpleMint', {
  name: "",
  unitName: "",
  totalSupply: 1,
  decimals: 0,
  image: null,
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
      if (
        formData.name === "" ||
        formData.unitName === "" ||
        formData.totalSupply === "" ||
        formData.decimals === "" ||
        formData.image === null ||
        token === ""
      ) {
        toast.error("Please fill all the required fields");
        return;
      }

      setProcessStep(1);
      let metadata = {
        name: formData.name,
        standard: "arc19",
        properties: {},
      };
      if (formData.external_url !== "") {
        metadata.external_url = formData.external_url;
      }
      if (formData.description !== "") {
        metadata.description = formData.description;
      }
      if (formData.traits.length > 0) {
        metadata.properties.traits = formData.traits.reduce((acc, trait) => {
          if (trait.category !== "" && trait.name !== "") {
            acc[trait.category] = trait.name;
          }
          return acc;
        }, {});
      }
      if (formData.filters.length > 0) {
        metadata.properties.filters = formData.filters.reduce((acc, filter) => {
          if (filter.category !== "" && filter.name !== "") {
            acc[filter.category] = filter.name;
          }
          return acc;
        }, {});
      }
      if (formData.extras.length > 0) {
        metadata.properties.extras = formData.extras.reduce((acc, extra) => {
          if (extra.category !== "" && extra.name !== "") {
            acc[extra.category] = extra.name;
          }
          return acc;
        }, {});
      }

      toast.info("Uploading the image to IPFS...");
      const imageURL = "ipfs://" + (await pinImageToPinata(token, formData.image));

      if (formData.image.type.includes("video")) {
        metadata.animation_url = imageURL;
        metadata.animation_url_mime_type = formData.image.type;
      } else {
        metadata.image = imageURL;
        metadata.image_mime_type = formData.image.type;
      }

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

      const nodeURL = getNodeURL();
      const unsignedAssetTransaction = await createARC19AssetMintArray(
        [metadataForIPFS],
        nodeURL,
        token
      );

      if (unsignedAssetTransaction.length === 0) {
        toast.error("Something went wrong while creating transactions");
        return;
      }

      setTransaction(unsignedAssetTransaction);
      toast.info("Please sign the transaction");
      setProcessStep(2);
    } catch (error) {
      console.log(error);
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
      const { txId } = await algodClient.sendRawTransaction(groups[0]).do();
      const response = await algodClient.pendingTransactionInformation(txId).do();
      const assetID = response["asset-index"];
      if (assetID) {
        toast.success(`NFT minted successfully with asset id: ${assetID}`);
        setCreatedAssetID(assetID);
        setTransaction(null);
        setFormData(RESET);
        setProcessStep(0);
      } else {
        toast.error("Something went wrong");
        setProcessStep(0);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
      setProcessStep(2);
    }
  }

  return (
    <div className="w-full flex justify-center py-5">
      <div className="max-w-4xl w-full flex flex-col items-center">
        <div className="w-full flex justify-center mb-4">
          <h1 className="text-3xl font-semibold text-gray-800">
            Simple ARC19 NFT Minting Tool
          </h1>
        </div>
        <div className="w-full p-4 bg-white rounded-md shadow-md">
          <form
            className="w-full flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              mint();
            }}
          >
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Asset Name"
                className="w-full md:w-1/2 bg-gray-100 text-black font-medium text-sm py-2 px-4 border rounded border-gray-200"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Unit Name"
                className="w-full md:w-1/2 bg-gray-100 text-black font-medium text-sm py-2 px-4 border rounded border-gray-200"
                value={formData.unitName}
                onChange={(e) =>
                  setFormData({ ...formData, unitName: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="number"
                placeholder="Total Supply"
                className="w-full md:w-1/2 bg-gray-100 text-black font-medium text-sm py-2 px-4 border rounded border-gray-200"
                value={formData.totalSupply}
                onChange={(e) =>
                  setFormData({ ...formData, totalSupply: e.target.value })
                }
              />
              <input
                type="number"
                placeholder="Decimals"
                className="w-full md:w-1/2 bg-gray-100 text-black font-medium text-sm py-2 px-4 border rounded border-gray-200"
                value={formData.decimals}
                onChange={(e) =>
                  setFormData({ ...formData, decimals: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="External URL"
                className="w-full md:w-1/2 bg-gray-100 text-black font-medium text-sm py-2 px-4 border rounded border-gray-200"
                value={formData.external_url}
                onChange={(e) =>
                  setFormData({ ...formData, external_url: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Description"
                className="w-full md:w-1/2 bg-gray-100 text-black font-medium text-sm py-2 px-4 border rounded border-gray-200"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/3 flex flex-col">
                  <label className="text-gray-700 font-semibold">Traits</label>
                  {formData.traits.map((trait) =>
                    TraitMetadataInputField(trait.id, "traits")
                  )}
                  <button
                    type="button"
                    className="mt-2 rounded bg-primary-blue text-lg hover:bg-blue-600 transition text-white ml-2 px-4"
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
                    +
                  </button>
                </div>
                <div className="w-full md:w-1/3 flex flex-col">
                  <label className="text-gray-700 font-semibold">Filters</label>
                  {formData.filters.map((filter) =>
                    TraitMetadataInputField(filter.id, "filters")
                  )}
                  <button
                    type="button"
                    className="mt-2 rounded bg-primary-blue text-lg hover:bg-blue-600 transition text-white ml-2 px-4"
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
                    +
                  </button>
                </div>
                <div className="w-full md:w-1/3 flex flex-col">
                  <label className="text-gray-700 font-semibold">Extras</label>
                  {formData.extras.map((extra) =>
                    TraitMetadataInputField(extra.id, "extras")
                  )}
                  <button
                    type="button"
                    className="mt-2 rounded bg-primary-blue text-lg hover:bg-blue-600 transition text-white ml-2 px-4"
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
                    +
                  </button>
                </div>
              </div>
              <div className="flex justify-start mt-4">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="block text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                "
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      image: e.target.files[0],
                    })
                  }
                />
              </div>
              <div className="flex justify-between mt-4">
                <Button
                  type="button"
                  variant="contained"
                  color="primary"
                  onClick={sendTransaction}
                  disabled={processStep !== 2}
                >
                  Sign & Mint
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  color="secondary"
                  onClick={() => setFormData(RESET)}
                >
                  Reset Form
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
