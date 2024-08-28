import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";

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
    <AppBar sx={{ backgroundColor: "#1A171A" }} position="sticky">
      <DropdownMenu isOpen={isSidesheetOpen} onClose={handleDrawerToggle} />

      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
        >
          <MdMenu />
        </IconButton>
        <Link to="/">
          <img src="/TL_large_white.png" alt="logo" className="mr-2 h-12 p-1" />
        </Link>
        <Typography
          component="div"
          sx={{
            fontFamily: "Josefin Slab",
            flexGrow: 1,
            fontWeight: 400,
            fontSize: {
              xs: "1rem",
              sm: "1.25rem",
              md: "1.5rem",
              lg: "1.75rem",
            },
            ":hover": {
              cursor: "pointer",
            },
            ml: { xs: 2, sm: 0 },
            visibility: { xs: "hidden", sm: "visible" },
          }}
        >
          Mint & Upgrade
        </Typography>
        <SelectNetworkComponent />
        <ConnectButton />
      </Toolbar>
      <div className="bg-secondary text-primary-black flex py-1 justify-center items-center">
        <p className="text-center text-sm">
          Welcome to the Mint & Upgrade platform! Explore our features and get started with your projects.
        </p>
      </div>
    </AppBar>
  );
}
