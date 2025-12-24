// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import { ChevronDown, LogOut, UserIcon, UserPlus, Wallet, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { RelaySelector } from '@/components/RelaySelector';
import { WalletModal } from '@/components/WalletModal';
import { useLoggedInAccounts, type Account } from '@/hooks/useLoggedInAccounts';
import { genUserName } from '@/lib/genUserName';
import { isArtist } from '@/lib/musicConfig';
import { Link } from 'react-router-dom';

interface AccountSwitcherProps {
  onAddAccountClick: () => void;
}

export function AccountSwitcher({ onAddAccountClick }: AccountSwitcherProps) {
  const { currentUser, otherUsers, setLogin, removeLogin } = useLoggedInAccounts();

  if (!currentUser) return null;

  const getDisplayName = (account: Account): string => {
    return account.metadata.name ?? genUserName(account.pubkey);
  }

  const isArtist_user = currentUser && isArtist(currentUser.pubkey);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className='flex items-center gap-3 p-3 rounded-full hover:bg-purple-500/10 transition-all w-full text-foreground'>
          <Avatar className='w-10 h-10'>
            <AvatarImage src={currentUser.metadata.picture} alt={getDisplayName(currentUser)} />
            <AvatarFallback>{getDisplayName(currentUser).charAt(0)}</AvatarFallback>
          </Avatar>
          <div className='flex-1 text-left hidden md:block truncate'>
            <p className='font-medium text-sm truncate'>{getDisplayName(currentUser)}</p>
          </div>
          <ChevronDown className='w-4 h-4 text-muted-foreground' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-64 p-2 animate-scale-in'>
        <div className='font-medium text-xs uppercase tracking-wider text-muted-foreground px-2 py-2'>Switch Relay</div>
        <RelaySelector className="w-full" />
        <DropdownMenuSeparator className="my-2" />
        <div className='font-medium text-xs uppercase tracking-wider text-muted-foreground px-2 py-2'>Switch Account</div>
        {otherUsers.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => setLogin(user.id)}
            className='flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-purple-500/10 focus:bg-purple-500/10 hover:text-foreground focus:text-foreground transition-all duration-200'
          >
            <Avatar className='w-8 h-8 ring-2 ring-transparent hover:ring-purple-500/30 transition-all'>
              <AvatarImage src={user.metadata.picture} alt={getDisplayName(user)} />
              <AvatarFallback className="bg-purple-500/10 text-purple-600">{getDisplayName(user)?.charAt(0) || <UserIcon />}</AvatarFallback>
            </Avatar>
            <div className='flex-1 truncate'>
              <p className='text-sm font-medium'>{getDisplayName(user)}</p>
            </div>
            {user.id === currentUser.id && <div className='w-2 h-2 rounded-full bg-purple-500'></div>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-2" />
        {isArtist_user && (
          <>
            <div className='font-medium text-xs uppercase tracking-wider text-muted-foreground px-2 py-2'>Artist Tools</div>
            <DropdownMenuItem asChild>
              <Link
                to="/studio"
                className='flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-cyan-500/10 focus:bg-cyan-500/10 hover:text-foreground focus:text-foreground transition-all duration-200'
              >
                <Settings className='w-4 h-4 text-cyan-500' />
                <span>Studio</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-2" />
          </>
        )}
        <WalletModal>
          <DropdownMenuItem
            className='flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-purple-500/10 focus:bg-purple-500/10 hover:text-foreground focus:text-foreground transition-all duration-200'
            onSelect={(e) => e.preventDefault()}
          >
            <Wallet className='w-4 h-4 text-purple-500' />
            <span>Wallet Settings</span>
          </DropdownMenuItem>
        </WalletModal>
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem
          onClick={onAddAccountClick}
          className='flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-purple-500/10 focus:bg-purple-500/10 hover:text-foreground focus:text-foreground transition-all duration-200'
        >
          <UserPlus className='w-4 h-4 text-purple-500' />
          <span>Add another account</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => removeLogin(currentUser.id)}
          className='flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-red-500/10 focus:bg-red-500/10 text-red-500 hover:text-red-500 focus:text-red-500 transition-all duration-200'
        >
          <LogOut className='w-4 h-4' />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}