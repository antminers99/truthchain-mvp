import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Wallet, ChevronDown, LogOut, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export function WalletButton() {
  const { 
    address, 
    isConnected, 
    isConnecting, 
    isPolygonMainnet,
    chainId,
    error,
    connect, 
    disconnect,
    switchToPolygon 
  } = useWallet();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getNetworkName = (id: number | null) => {
    switch (id) {
      case 137: return 'Polygon';
      case 1: return 'Ethereum';
      case 80001: return 'Mumbai';
      case 80002: return 'Amoy';
      default: return `Chain ${id}`;
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button 
          onClick={connect} 
          disabled={isConnecting}
          variant="default"
          className="gap-2"
          data-testid="button-connect-wallet"
        >
          <Wallet className="h-4 w-4" />
          {isConnecting ? 'جاري الاتصال...' : 'ربط المحفظة'}
        </Button>
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!isPolygonMainnet && (
        <Button 
          variant="destructive" 
          size="sm"
          onClick={switchToPolygon}
          className="gap-1"
          data-testid="button-switch-network"
        >
          <AlertTriangle className="h-3 w-3" />
          التبديل إلى Polygon
        </Button>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2" data-testid="button-wallet-menu">
            <Wallet className="h-4 w-4" />
            <span className="font-mono text-sm">{formatAddress(address!)}</span>
            <Badge 
              variant={isPolygonMainnet ? "default" : "secondary"}
              className="text-xs"
            >
              {getNetworkName(chainId)}
            </Badge>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="font-mono text-xs" disabled>
            {address}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {!isPolygonMainnet && (
            <DropdownMenuItem onClick={switchToPolygon} data-testid="menu-switch-polygon">
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
              التبديل إلى Polygon
            </DropdownMenuItem>
          )}
          <DropdownMenuItem 
            onClick={disconnect}
            className="text-destructive"
            data-testid="menu-disconnect"
          >
            <LogOut className="h-4 w-4 mr-2" />
            قطع الاتصال
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
