using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MorfApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderExtraFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "address",
                table: "orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "customer_name",
                table: "orders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "delivery_mode",
                table: "orders",
                type: "text",
                nullable: false,
                defaultValue: "delivery");

            migrationBuilder.AddColumn<string>(
                name: "notes",
                table: "orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payment_method",
                table: "orders",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "address",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "customer_name",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "delivery_mode",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "notes",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "payment_method",
                table: "orders");
        }
    }
}
