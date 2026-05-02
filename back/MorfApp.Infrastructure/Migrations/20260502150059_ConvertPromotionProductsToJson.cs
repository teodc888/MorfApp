using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ConvertPromotionProductsToJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "product_ids",
                table: "promotions",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            // Migrate data from promotion_products to product_ids JSON
            migrationBuilder.Sql(@"
                UPDATE promotions
                SET product_ids = COALESCE(
                    (SELECT jsonb_agg(product_id ORDER BY product_id)
                     FROM promotion_products
                     WHERE promotion_id = promotions.id),
                    '[]'::jsonb
                );
            ");

            migrationBuilder.DropTable(
                name: "promotion_products");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "product_ids",
                table: "promotions");

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
                name: "ix_promotion_products_product_id",
                table: "promotion_products",
                column: "product_id");
        }
    }
}
