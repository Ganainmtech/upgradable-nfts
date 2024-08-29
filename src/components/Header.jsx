// Header.js
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import CarouselComponent from "./CarouselComponent";
import { Link } from "react-router-dom";
import ConnectButton from "./ConnectButton";
import SelectNetworkComponent from "./SelectNetworkComponent";
import { MdMenu } from "react-icons/md";
import { useState } from "react";
import DropdownMenu from "./DropdownMenu";

export function Header() {
  const [isSidesheetOpen, setIsSidesheetOpen] = useState(false);

  const handleDrawerToggle = () => {
    setIsSidesheetOpen(!isSidesheetOpen);
  };

  return (
    <AppBar
      sx={{
        backgroundColor: "#1A171A",
        paddingTop: 0.5, // Reduced top padding
        paddingBottom: 0.5, // Reduced bottom padding
      }}
      position="sticky"
    >
      <DropdownMenu isOpen={isSidesheetOpen} onClose={handleDrawerToggle} />

      <Toolbar
        sx={{
          padding: '0 !important',
          height: 'auto',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
        >
          <MdMenu />
        </IconButton>
        <a
          href="/"
          style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }} // Adjust margin to reduce spacing
        >
          <CarouselComponent
            images={[
              { path: "/algoblue.png" },
              { path: "/algowhite.png" },
              { path: "/algoteal.png" },
            ]}
            style={{ width: '75px', height: '75px' }} // Adjust width to fit better
          />
        </a>
        <div style={{ flexGrow: 1 }}></div>
        <SelectNetworkComponent />
        <ConnectButton />
      </Toolbar>
      <div className="header-bottom">
        <p className="text-center text-sm">
          Welcome! Use this application to mint and upgrade your Algorand NFTs!
        </p>
      </div>
    </AppBar>
  );
}
