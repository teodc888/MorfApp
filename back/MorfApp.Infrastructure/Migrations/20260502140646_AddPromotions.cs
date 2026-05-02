using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPromotions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "promotions",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    tenant_id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    emoji = table.Column<string>(type: "text", nullable: false),
                    image_url = table.Column<string>(type: "text", nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    max_per_user = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_promotions", x => x.id);
                    table.ForeignKey(
                        name: "fk_promotions_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "promo_redemptions",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    promotion_id = table.Column<string>(type: "text", nullable: false),
                    tenant_id = table.Column<string>(type: "text", nullable: false),
                    phone_number = table.Column<string>(type: "text", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_promo_redemptions", x => x.id);
                    table.ForeignKey(
                        name: "fk_promo_redemptions_promotions_promotion_id",
                        column: x => x.promotion_id,
                        principalTable: "promotions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "promotion_products",
                columns: table => new
                {
                    promotion_id = table.Column<string>(type: "text", nullable: false),
                    product_id = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_promotion_products", x => new { x.promotion_id, x.product_id });
                    table.ForeignKey(
                        name: "fk_promotion_products_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_promotion_products_promotions_promotion_id",
                        column: x => x.promotion_id,
                        principalTable: "promotions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_promo_redemptions_promotion_id_phone_number",
                table: "promo_redemptions",
                columns: new[] { "promotion_id", "phone_number" });

            migrationBuilder.CreateIndex(
                name: "ix_promo_redemptions_tenant_id_phone_number",
                table: "promo_redemptions",
                columns: new[] { "tenant_id", "phone_number" });

            migrationBuilder.CreateIndex(
                name: "ix_promotion_products_product_id",
                table: "promotion_products",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_promotions_tenant_id",
                table: "promotions",
                column: "tenant_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "promo_redemptions");

            migrationBuilder.DropTable(
                name: "promotion_products");

            migrationBuilder.DropTable(
                name: "promotions");
        }
    }
}
