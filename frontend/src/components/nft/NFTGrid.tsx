import { NFT } from '@/types';
import NFTCard from './NFTCard';

interface NFTGridProps {
  nfts: NFT[];
}

export default function NFTGrid({ nfts }: NFTGridProps) {
  if (nfts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">Aucun NFT disponible.</p>
        <p className="text-gray-400 mt-2">Mintez un NFT depuis la page Admin.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {nfts.map((nft) => (
        <NFTCard key={nft.tokenId} nft={nft} />
      ))}
    </div>
  );
}
