<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function dashboard(): JsonResponse
    {
        return response()->json([
            'stats' => [
                'products_count' => Product::count(),
                'orders_count' => Order::count(),
                'pending_orders' => Order::where(
                    'status',
                    'pending'
                )->count(),
                'total_sales' => (float) Order::whereIn('status', [
                    'processing',
                    'shipped',
                    'delivered',
                ])->sum('total'),
            ],

            'recent_orders' => Order::with('items')
                ->latest()
                ->take(10)
                ->get(),

            'products' => Product::latest()
                ->take(10)
                ->get(),
        ]);
    }

    public function updateOrder(
        Request $request,
        Order $order
    ): JsonResponse {
        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in([
                    'pending',
                    'processing',
                    'shipped',
                    'delivered',
                    'cancelled',
                ]),
            ],
        ]);

        try {
            $updatedOrder = DB::transaction(function () use (
                $order,
                $validated
            ) {
                $lockedOrder = Order::whereKey($order->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $oldStatus = $lockedOrder->status;
                $newStatus = $validated['status'];

                // No stock changes if the status is unchanged.
                if ($oldStatus === $newStatus) {
                    return $lockedOrder->load('items');
                }

                // Restore stock when an active order is cancelled.
                if (
                    $oldStatus !== 'cancelled'
                    && $newStatus === 'cancelled'
                ) {
                    foreach ($lockedOrder->items as $item) {
                        $product = Product::whereKey(
                            $item->product_id
                        )
                            ->lockForUpdate()
                            ->firstOrFail();

                        $product->increment(
                            'stock',
                            (int) $item->quantity
                        );
                    }
                }

                // Reserve stock again when a cancelled order is reactivated.
                if (
                    $oldStatus === 'cancelled'
                    && $newStatus !== 'cancelled'
                ) {
                    foreach ($lockedOrder->items as $item) {
                        $product = Product::whereKey(
                            $item->product_id
                        )
                            ->lockForUpdate()
                            ->firstOrFail();

                        $quantity = (int) $item->quantity;

                        if ($product->stock < $quantity) {
                            throw new \DomainException(
                                "Insufficient stock to reactivate order. "
                                . "Product: {$product->name}"
                            );
                        }

                        $product->decrement('stock', $quantity);
                    }
                }

                $lockedOrder->update([
                    'status' => $newStatus,
                ]);

                return $lockedOrder->fresh()->load('items');
            });

            return response()->json([
                'message' => 'Order status updated successfully.',
                'order' => $updatedOrder,
            ]);
        } catch (\DomainException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}