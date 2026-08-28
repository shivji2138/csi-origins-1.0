// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/AgoraEscrow.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address verifierAddress = vm.envAddress("VERIFIER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        AgoraEscrow escrow = new AgoraEscrow(verifierAddress);

        vm.stopBroadcast();

        console.log("AgoraEscrow deployed to:", address(escrow));
    }
}
