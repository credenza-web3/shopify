// ============================================================
// GATE — unified access check
//
// gate.type = "nft"        → checks ERC-1155 token balance
// gate.type = "offer"      → validates offer via Credenza API
// gate.type = "membership" → checks membership via passport
//
// Returns { allowed: boolean, code: string | null }
// code — discount code (offer and membership only)
// ============================================================

const validateOffer = async (passport, offerId) => {
  const { clientId } = window.credenzaConfig || {};
  const res = await fetch(
    `https://api.staging.credenza3.com/promo/offers/${offerId}/check?sub=true&reveal_code=true`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-client-id": clientId,
        Authorization: `Bearer ${passport.accessToken}`,
      },
    },
  );
  if (!res.ok) return null;
  const code = await res.text();
  return code || null;
};

const checkNftOwnership = async (passport, gate) => {
  try {
    const address = await passport.getAddress();
    const provider = await passport.getWeb3Provider();
    const abi = ["function balanceOf(address account, uint256 id) view returns (uint256)"];
    const contract = new passport.ethers.Contract(gate.contractAddress, abi, provider);
    const balance = await contract.balanceOf(address, gate.tokenId);
    return balance > 0n;
  } catch {
    return false;
  }
};

export const checkGate = async (passport, gate) => {
  if (gate.type === "nft") {
    const allowed = await checkNftOwnership(passport, gate);
    return { allowed, code: null };
  }

  if (gate.type === "offer") {
    const code = await validateOffer(passport, gate.offerId);
    return { allowed: !!code, code };
  }

  if (gate.type === "membership") {
    const address = await passport.getAddress();
    const { isMember, meta } = await passport.checkMembership(address, gate.membershipPackage);
    return { allowed: isMember, code: meta || null };
  }

  return { allowed: false, code: null };
};
