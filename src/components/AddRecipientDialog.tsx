import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
  DrawerFooter,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/useIsMobile';

interface RecipientData {
  name: string;
  type: 'node' | 'lnaddress';
  address: string;
  split: number;
  customKey?: string;
  customValue?: string;
  fee?: boolean;
}

interface AddRecipientDialogProps {
  onAddRecipient: (recipient: RecipientData) => void;
  onEditRecipient?: (index: number, recipient: RecipientData) => void;
  editingRecipient?: RecipientData;
  editingIndex?: number;
  children?: React.ReactNode;
}

export function AddRecipientDialog({ 
  onAddRecipient, 
  onEditRecipient, 
  editingRecipient, 
  editingIndex, 
  children 
}: AddRecipientDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<RecipientData>({
    name: '',
    type: 'node',
    address: '',
    split: 0,
    customKey: '',
    customValue: '',
    fee: false,
  });
  const isMobile = useIsMobile();

  const isEditMode = editingRecipient !== undefined;

  // Initialize form data when editing
  useEffect(() => {
    if (editingRecipient) {
      setFormData(editingRecipient);
    }
  }, [editingRecipient]);

  const handleInputChange = (field: keyof RecipientData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    if (formData.name && formData.address && formData.split > 0) {
      if (isEditMode && onEditRecipient && editingIndex !== undefined) {
        onEditRecipient(editingIndex, formData);
      } else {
        onAddRecipient(formData);
      }
      
      // Reset form only if not editing
      if (!isEditMode) {
        setFormData({
          name: '',
          type: 'node',
          address: '',
          split: 0,
          customKey: '',
          customValue: '',
          fee: false,
        });
      }
      setOpen(false);
    }
  };

  const isValid = formData.name && formData.address && formData.split > 0;

  const RecipientForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Recipient name"
          />
        </div>

        <div>
          <Label htmlFor="type">Type *</Label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value as 'node' | 'lnaddress')}
            className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring"
          >
            <option value="node">Lightning Node</option>
            <option value="lnaddress">Lightning Address</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Lightning node pubkey or lightning address"
        />
      </div>

      <div>
        <Label htmlFor="split">Split (%) *</Label>
        <Input
          id="split"
          type="number"
          min="0"
          max="100"
          value={formData.split}
          onChange={(e) => handleInputChange('split', parseInt(e.target.value) || 0)}
          placeholder="0-100"
        />
      </div>

      <div>
        <Label htmlFor="customKey">Custom Key (Optional)</Label>
        <Input
          id="customKey"
          value={formData.customKey}
          onChange={(e) => handleInputChange('customKey', e.target.value)}
          placeholder="Custom TLV key for Lightning payments"
        />
      </div>

      <div>
        <Label htmlFor="customValue">Custom Value (Optional)</Label>
        <Input
          id="customValue"
          value={formData.customValue}
          onChange={(e) => handleInputChange('customValue', e.target.value)}
          placeholder="Custom TLV value for Lightning payments"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.fee}
          onCheckedChange={(checked) => handleInputChange('fee', checked)}
        />
        <Label>Fee Recipient</Label>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {children || (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add New Recipient
            </Button>
          )}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{isEditMode ? 'Edit Recipient' : 'Add New Recipient'}</DrawerTitle>
            <DrawerDescription>
              {isEditMode 
                ? 'Update the Lightning payment recipient details.' 
                : 'Add a new Lightning payment recipient for value-for-value support.'
              }
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            <RecipientForm />
          </div>
          <DrawerFooter>
            <Button onClick={handleSubmit} disabled={!isValid}>
              {isEditMode ? 'Update Recipient' : 'Add Recipient'}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add New Recipient
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Recipient' : 'Add New Recipient'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update the Lightning payment recipient details.' 
              : 'Add a new Lightning payment recipient for value-for-value support.'
            }
          </DialogDescription>
        </DialogHeader>
        <RecipientForm />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            {isEditMode ? 'Update Recipient' : 'Add Recipient'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}