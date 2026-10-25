
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerAuthController;
use App\Http\Controllers\Api\CustomerOrderController;
use App\Http\Controllers\AdminController;

// Public product routes
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);

// Checkout
Route::post('/orders', [OrderController::class, 'store']);

// Admin login
Route::post('/admin/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

// Customer authentication
Route::post('/register', [CustomerAuthController::class, 'register'])
    ->middleware('throttle:5,1');

Route::post('/login', [CustomerAuthController::class, 'login'])
    ->middleware('throttle:5,1');

// Customer account and orders
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/customer/me', [CustomerAuthController::class, 'me']);
    Route::post('/customer/logout', [CustomerAuthController::class, 'logout']);

    Route::get('/customer/orders', [CustomerOrderController::class, 'index']);
    Route::get('/customer/orders/{id}', [CustomerOrderController::class, 'show']);
});

// Admin protected routes
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
    Route::patch('/admin/orders/{order}', [AdminController::class, 'updateOrder']);

    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::patch('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);

    Route::post('/admin/logout', [AuthController::class, 'logout']);
});

// Authenticated user info
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
