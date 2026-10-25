<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->foreignId('order_id')
                ->after('id')
                ->constrained('orders')
                ->cascadeOnDelete();

            $table->foreignId('product_id')
                ->after('order_id')
                ->constrained('products')
                ->restrictOnDelete();

            $table->unsignedInteger('quantity');
            $table->decimal('price', 10, 2);
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropForeign(['order_id']);
            $table->dropColumn([
                'order_id',
                'product_id',
                'quantity',
                'price',
            ]);
        });
    }
};