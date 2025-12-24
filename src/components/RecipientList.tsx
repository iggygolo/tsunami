import { Edit, Trash2, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddRecipientDialog } from './AddRecipientDialog';

interface RecipientData {
  name: string;
  type: 'node' | 'lnaddress';
  address: string;
  split: number;
  customKey?: string;
  customValue?: string;
  fee?: boolean;
}

interface RecipientListProps {
  recipients: RecipientData[];
  onAddRecipient: (recipient: RecipientData) => void;
  onEditRecipient: (index: number, recipient: RecipientData) => void;
  onRemoveRecipient: (index: number) => void;
}

export function RecipientList({ 
  recipients, 
  onAddRecipient, 
  onEditRecipient, 
  onRemoveRecipient 
}: RecipientListProps) {
  const totalSplit = recipients.reduce((sum, r) => sum + r.split, 0);

  return (
    <div className="space-y-4">
      {/* Total Split Summary */}
      {recipients.length > 0 && (
        <div className="flex items-center pt-2 text-sm">
          <span className="text-muted-foreground p-2">Total Split:</span>
          <span className={`font-medium ${totalSplit === 100 ? 'text-green-600' : 'text-orange-600'}`}>
            {totalSplit}%
          </span>
        </div>
      )}

      {/* Recipients List */}
      {recipients.length > 0 ? (
        <div className="space-y-2">
          {recipients.map((recipient, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{recipient.name}</span>
                  {recipient.type === 'node' ? (
                    <Zap className="w-3 h-3 text-orange-500" />
                  ) : (
                    <Globe className="w-3 h-3 text-blue-500" />
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {recipient.type === 'node' ? 'Node' : 'Address'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {recipient.address}
                </div>
                <div className="text-sm text-muted-foreground">
                  Split: <strong>{recipient.split}%</strong>
                </div>
              </div>
              
              <div className="flex items-center gap-1 ml-4">
                <AddRecipientDialog
                  onAddRecipient={onAddRecipient}
                  onEditRecipient={onEditRecipient}
                  editingRecipient={recipient}
                  editingIndex={index}
                >
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </AddRecipientDialog>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveRecipient(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
          <Zap className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recipients configured</p>
        </div>
      )}

      {/* Add New Recipient Button */}
      <div className="flex justify-center pt-2">
        <AddRecipientDialog onAddRecipient={onAddRecipient} />
      </div>
    </div>
  );
}