using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    public partial class AddTenantModifierGroups : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop old FK from modifier_groups → products
            migrationBuilder.DropForeignKey(
                name: "fk_modifier_groups_products_product_id",
                table: "modifier_groups");

            migrationBuilder.DropColumn(
                name: "product_id",
                table: "modifier_groups");

            // Add tenant_id to modifier_groups
            migrationBuilder.AddColumn<string>(
                name: "tenant_id",
                table: "modifier_groups",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "ix_modifier_groups_tenant_id",
                table: "modifier_groups",
                column: "tenant_id");

            migrationBuilder.AddForeignKey(
                name: "fk_modifier_groups_tenants_tenant_id",
                table: "modifier_groups",
                column: "tenant_id",
                principalTable: "tenants",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            // Create many-to-many junction table
            migrationBuilder.CreateTable(
                name: "product_modifier_groups",
                columns: table => new
                {
                    product_id = table.Column<string>(type: "text", nullable: false),
                    modifier_group_id = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_product_modifier_groups", x => new { x.product_id, x.modifier_group_id });
                    table.ForeignKey(
                        name: "fk_product_modifier_groups_modifier_groups_modifier_group_id",
                        column: x => x.modifier_group_id,
                        principalTable: "modifier_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_product_modifier_groups_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_product_modifier_groups_modifier_group_id",
                table: "product_modifier_groups",
                column: "modifier_group_id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "product_modifier_groups");

            migrationBuilder.DropForeignKey(
                name: "fk_modifier_groups_tenants_tenant_id",
                table: "modifier_groups");

            migrationBuilder.DropIndex(
                name: "ix_modifier_groups_tenant_id",
                table: "modifier_groups");

            migrationBuilder.DropColumn(
                name: "tenant_id",
                table: "modifier_groups");

            migrationBuilder.AddColumn<string>(
                name: "product_id",
                table: "modifier_groups",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddForeignKey(
                name: "fk_modifier_groups_products_product_id",
                table: "modifier_groups",
                column: "product_id",
                principalTable: "products",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
