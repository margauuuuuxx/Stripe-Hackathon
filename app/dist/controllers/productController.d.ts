import { Request, Response } from 'express';
export declare class ProductController {
    private stripeService;
    constructor(stripeSecretKey: string);
    getAllProducts(req: Request, res: Response): Promise<void>;
    getProductsByUrl(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=productController.d.ts.map