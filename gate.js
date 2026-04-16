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
    `https://api.staging.credenza3.com/promo/offers/available-offers/${clientId}?offer_id=${offerId}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${passport.accessToken}`,
      },
    },
  );
  if (!res.ok) return null;
  const offers = await res.json();

  return offers[0]?.code || null;
};

const checkNftOwnership = async (passport, gate) => {
  try {
    const address = await passport.getAddress();
    const provider = await passport.getWeb3Provider();
    const abi = [
      "function balanceOf(address account, uint256 id) view returns (uint256)",
    ];
    const contract = new passport.ethers.Contract(
      gate.contractAddress,
      abi,
      provider,
    );

    const [balance, uri] = await Promise.all([
      contract
        .balanceOf(address, gate.token_id)
        .then((balance) => parseInt(balance)),
      contract.uri(gate.token_id).then((uri) => {
        if (uri.startsWith("ipfs://")) {
          return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
        }
        return uri;
      }),
    ]);

    let code = null;
    if (uri) {
      try {
        const { data } = await axios.get(uri);
        code = data.code || null;
      } catch {
        // uri недоступен — code остаётся null
      }
    }

    return {
      allowed: !!balance,
      code,
    };
  } catch {
    return {
      allowed: false,
      code: null,
    };
  }
};

export const checkGate = async (passport, gate) => {
  if (gate.type === "nft") {
    const { allowed, code } = await checkNftOwnership(passport, gate);
    return { allowed, code };
  }

  if (gate.type === "offer") {
    const code = await validateOffer(passport, gate.offerId);
    return { allowed: !!code, code };
  }

  if (gate.type === "membership") {
    const address = await passport.getAddress();
    const { isMember, meta } = await passport.checkMembership(
      address,
      gate.membershipPackage,
    );
    return { allowed: isMember, code: meta || null };
  }

  return { allowed: false, code: null };
};
