<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'required|email|max:255',
            'customer_phone' => 'required|string|max:30',
            'customer_address' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|distinct|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Invalid order data',
                'errors' => $validator->errors(),
            ], 422);
        }

        $customer = $request->user('sanctum');

        try {
            $order = DB::transaction(function () use ($request, $customer) {
                $total = 0;
                $orderItems = [];

                foreach ($request->items as $item) {
                    $product = Product::whereKey($item['product_id'])
                        ->lockForUpdate()
                        ->firstOrFail();

                    $quantity = (int) $item['quantity'];

                    if ($product->stock < $quantity) {
                        throw new \RuntimeException(
                            "Insufficient stock for {$product->name}"
                        );
                    }

                    $price = $product->price;
                    $total += $price * $quantity;

                    $orderItems[] = [
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'price' => $price,
                    ];

                    $product->decrement('stock', $quantity);
                }

                $order = Order::create([
                    'user_id' => $customer?->id,
                    'customer_name' => $request->customer_name,
                    'customer_email' => $request->customer_email,
                    'customer_phone' => $request->customer_phone,
                    'customer_address' => $request->customer_address,
                    'total' => $total,
                    'status' => 'pending',
                ]);

                $order->items()->createMany($orderItems);

                return $order->load('items');
            });

            return response()->json([
                'message' => 'Order created successfully',
                'order' => $order,
            ], 201);

        } catch (\RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
