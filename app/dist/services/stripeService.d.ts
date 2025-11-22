import { StripeProduct } from '../types';
export declare class StripeService {
    private stripe;
    constructor(secretKey: string);
    getAllProducts(): Promise<StripeProduct[]>;
    getProductsByUrl(url: string): Promise<StripeProduct[]>;
}
//# sourceMappingURL=stripeService.d.ts.map