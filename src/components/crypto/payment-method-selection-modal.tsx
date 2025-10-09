'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Zap, 
  X,
  ChevronRight
} from 'lucide-react'

interface PaymentProcessor {
  id: string
  name: string
  type: 'digital' | 'crypto'
  icon: React.ReactNode
  description: string
  regions: string[]
  available?: boolean
}

interface PaymentMethodSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onPaymentMethodSelected: (processor: PaymentProcessor) => void
}

const paymentProcessors: PaymentProcessor[] = [
  {
    id: 'crypto',
    name: 'USDC (Crypto)',
    type: 'crypto',
    icon: <Zap className="h-6 w-6" />,
    description: 'Direct USDC deposits via Polygon network',
    regions: ['Global'],
    available: true
  }
]

export function PaymentMethodSelectionModal({ 
  isOpen, 
  onClose, 
  onPaymentMethodSelected 
}: PaymentMethodSelectionModalProps) {
  const handlePaymentMethodClick = (processor: PaymentProcessor) => {
    if (processor.available) {
      onPaymentMethodSelected(processor)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Add a payment method</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {paymentProcessors.map((processor) => (
            <div 
              key={processor.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                processor.available 
                  ? 'border-gray-200 hover:border-gray-300 cursor-pointer hover:bg-gray-50' 
                  : 'border-gray-200 cursor-not-allowed opacity-75'
              }`}
              onClick={() => handlePaymentMethodClick(processor)}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  processor.type === 'crypto' 
                    ? 'bg-blue-100' 
                    : 'bg-gray-100'
                }`}>
                  {processor.icon}
                </div>
                <div>
                  <div className="font-medium flex items-center space-x-2">
                    <span>{processor.name}</span>
                    {processor.available ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Available
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-sm text-gray-500">
                    {processor.description}
                  </div>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 ${
                processor.available ? 'text-gray-600' : 'text-gray-400'
              }`} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

